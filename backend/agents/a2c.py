import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.distributions import Categorical, Normal
from pathlib import Path
from typing import List, Dict

from .dqn import _device


class ActorCriticNet(nn.Module):
    """Shared backbone with separate Actor and Critic heads."""

    def __init__(self, obs_dim: int, n_actions: int, hidden: int = 128, continuous: bool = False):
        super().__init__()
        self.continuous = continuous
        self.backbone = nn.Sequential(
            nn.Linear(obs_dim, hidden), nn.Tanh(),
            nn.Linear(hidden, hidden), nn.Tanh(),
        )
        if continuous:
            self.actor_mean = nn.Linear(hidden, n_actions)
            self.actor_log_std = nn.Parameter(torch.zeros(n_actions))
        else:
            self.actor = nn.Linear(hidden, n_actions)
        self.critic = nn.Linear(hidden, 1)

    def forward(self, x: torch.Tensor):
        feat = self.backbone(x)
        value = self.critic(feat).squeeze(-1)
        if self.continuous:
            mean = torch.tanh(self.actor_mean(feat))
            std = torch.exp(self.actor_log_std.clamp(-4, 1))
            dist = Normal(mean, std)
        else:
            logits = self.actor(feat)
            dist = Categorical(logits=logits)
        return dist, value


class A2CAgent:
    def __init__(
        self,
        obs_dim: int,
        n_actions: int,
        lr: float = 3e-4,
        gamma: float = 0.99,
        value_coef: float = 0.5,
        entropy_coef: float = 0.01,
        n_steps: int = 20,
        continuous: bool = False,
    ):
        self.gamma = gamma
        self.value_coef = value_coef
        self.entropy_coef = entropy_coef
        self.n_steps = n_steps
        self.continuous = continuous
        self.n_actions = n_actions

        self.device = _device()
        self.net = ActorCriticNet(obs_dim, n_actions, continuous=continuous).to(self.device)
        self.optimizer = optim.Adam(self.net.parameters(), lr=lr)

    def _to_tensor(self, x) -> torch.Tensor:
        return torch.tensor(np.array(x), dtype=torch.float32, device=self.device)

    def select_action(self, obs: np.ndarray):
        with torch.no_grad():
            t = self._to_tensor(obs).unsqueeze(0)
            dist, _ = self.net(t)
            action = dist.sample()
        if self.continuous:
            return action.cpu().numpy()[0]
        return int(action.item())

    def _compute_returns(self, rewards, dones, last_value):
        returns = []
        R = last_value
        for r, d in zip(reversed(rewards), reversed(dones)):
            R = r + self.gamma * R * (1 - d)
            returns.insert(0, R)
        return returns

    def _update(self, obs_buf, act_buf, ret_buf):
        obs_t = self._to_tensor(obs_buf)
        ret_t = self._to_tensor(ret_buf)

        if self.continuous:
            act_t = self._to_tensor(act_buf)
        else:
            act_t = torch.tensor(act_buf, dtype=torch.long, device=self.device)

        dist, values = self.net(obs_t)
        log_probs = dist.log_prob(act_t)
        if self.continuous:
            log_probs = log_probs.sum(dim=-1)

        advantages = ret_t - values.detach()
        actor_loss = -(log_probs * advantages).mean()
        critic_loss = nn.functional.mse_loss(values, ret_t)
        entropy = dist.entropy()
        if self.continuous:
            entropy = entropy.sum(dim=-1)
        entropy_loss = -entropy.mean()

        loss = actor_loss + self.value_coef * critic_loss + self.entropy_coef * entropy_loss
        self.optimizer.zero_grad()
        loss.backward()
        nn.utils.clip_grad_norm_(self.net.parameters(), 0.5)
        self.optimizer.step()

    def train(self, env, total_steps: int = 300_000) -> Dict:
        rewards_per_ep: List[float] = []
        obs = env.reset()
        ep_reward = 0.0
        obs_buf, act_buf, rew_buf, done_buf = [], [], [], []

        for step in range(total_steps):
            act = self.select_action(obs)
            next_obs, reward, done, _ = env.step(act)

            obs_buf.append(obs)
            act_buf.append(act if self.continuous else act)
            rew_buf.append(reward)
            done_buf.append(float(done))
            ep_reward += reward

            if done:
                rewards_per_ep.append(ep_reward)
                ep_reward = 0.0
                obs = env.reset()
            else:
                obs = next_obs

            if len(obs_buf) >= self.n_steps or done:
                with torch.no_grad():
                    t = self._to_tensor(obs).unsqueeze(0)
                    _, last_v = self.net(t)
                    last_value = 0.0 if done else float(last_v.item())
                returns = self._compute_returns(rew_buf, done_buf, last_value)
                self._update(obs_buf, act_buf, returns)
                obs_buf, act_buf, rew_buf, done_buf = [], [], [], []

        return {"rewards": rewards_per_ep}

    # ------------------------------------------------------------------ #
    #  Policy/Value maps for GridWorld                                     #
    # ------------------------------------------------------------------ #

    def get_policy_value_maps(self, env) -> Dict:
        self.net.eval()
        policy_map, value_map = [], []
        with torch.no_grad():
            for s in range(env.n_states):
                state = env.idx_to_state(s)
                # Use raw state tuple — same as what the training loop feeds.
                # state_to_obs() normalises to [0,1] but training used raw (r,c)
                # ints, so normalized inputs cause a distribution shift here.
                obs = np.array(state, dtype=np.float32)
                t = self._to_tensor(obs).unsqueeze(0)
                dist, val = self.net(t)
                probs = torch.softmax(dist.logits, dim=-1).cpu().numpy()[0]
                policy_map.append([round(float(p), 4) for p in probs])
                value_map.append(round(float(val.item()), 4))
        self.net.train()
        return {"policy_map": policy_map, "value_map": value_map}

    def run_demo(self, env) -> Dict:
        self.net.eval()
        obs = env.reset()
        raw_state = obs
        trajectory = []
        ep_reward = 0.0

        stall = 0          # consecutive steps with ~no movement (continuous only)
        prev_xy = None
        # Cycle detection for discrete grids (deterministic greedy policy).
        seen = {tuple(obs)} if (not self.continuous and hasattr(env, "n_states")) else None
        for _ in range(env.max_steps if hasattr(env, "max_steps") else 300):
            with torch.no_grad():
                t = self._to_tensor(obs).unsqueeze(0)
                dist, val = self.net(t)
                if self.continuous:
                    # See PPOAgent.run_demo: greedy mean can deadlock against a
                    # wall on a static observation; sample to escape a stall.
                    if stall >= 3:
                        action = dist.sample().cpu().numpy()[0]
                    else:
                        action = dist.mean.cpu().numpy()[0]
                    log_p = dist.log_prob(self._to_tensor(action)).sum().item()
                else:
                    action = int(dist.probs.argmax().item())
                    log_p = dist.log_prob(torch.tensor(action, device=self.device)).item()

            next_state, reward, done, _ = env.step(action)
            if self.continuous:
                xy = (float(next_state[0]), float(next_state[1]))
                if prev_xy is not None:
                    moved = ((xy[0] - prev_xy[0]) ** 2 + (xy[1] - prev_xy[1]) ** 2) ** 0.5
                    stall = stall + 1 if moved < 1e-4 else 0
                prev_xy = xy

            step_info = {
                "state": raw_state.tolist() if hasattr(raw_state, "tolist") else list(raw_state),
                "action": action.tolist() if hasattr(action, "tolist") else action,
                "reward": round(reward, 3),
                "value": round(float(val.item()), 4),
                "log_prob": round(log_p, 4),
                "done": done,
            }
            trajectory.append(step_info)
            ep_reward += reward
            # Feed raw next_state — matches what the training loop does.
            # (state_to_obs normalises to [0,1] but training fed raw tuples/arrays,
            # so using normalized values here would be a distribution shift.)
            obs = next_state
            raw_state = next_state
            if done:
                ns = next_state.tolist() if hasattr(next_state, "tolist") else list(next_state)
                trajectory.append({
                    "state": ns,
                    "action": action.tolist() if hasattr(action, "tolist") else action,
                    "reward": 0.0,
                    "value": round(float(val.item()), 4),
                    "log_prob": round(log_p, 4),
                    "done": True,
                })
                break
            if seen is not None:
                key = tuple(next_state)
                if key in seen:
                    break
                seen.add(key)

        self.net.train()
        result = {"episode": trajectory, "total_reward": round(ep_reward, 2)}
        if hasattr(env, "n_states"):
            result.update(self.get_policy_value_maps(env))
        if hasattr(env, "get_config") and env.get_config().get("type") == "nav2d":
            result["trajectory"] = [
                s["state"][:2] for s in trajectory
            ]
        return result

    def save(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        torch.save(self.net.state_dict(), str(path))

    def load(self, path: Path):
        self.net.load_state_dict(torch.load(str(path), map_location=self.device))
