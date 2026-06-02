import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.distributions import Categorical, Normal
from pathlib import Path
from typing import List, Dict

from .dqn import _device
from .a2c import ActorCriticNet


class PPOAgent:
    """
    Proximal Policy Optimization with clipped surrogate objective.
    Supports both discrete (GridWorld) and continuous (Nav2D) action spaces.
    """

    def __init__(
        self,
        obs_dim: int,
        n_actions: int,
        lr: float = 3e-4,
        gamma: float = 0.99,
        lam: float = 0.95,
        clip_eps: float = 0.2,
        value_coef: float = 0.5,
        entropy_coef: float = 0.01,
        n_epochs: int = 10,
        horizon: int = 2048,
        batch_size: int = 64,
        continuous: bool = False,
    ):
        self.gamma = gamma
        self.lam = lam
        self.clip_eps = clip_eps
        self.value_coef = value_coef
        self.entropy_coef = entropy_coef
        self.n_epochs = n_epochs
        self.horizon = horizon
        self.batch_size = batch_size
        self.continuous = continuous
        self.n_actions = n_actions

        self.device = _device()
        self.net = ActorCriticNet(obs_dim, n_actions, hidden=128, continuous=continuous).to(
            self.device
        )
        self.optimizer = optim.Adam(self.net.parameters(), lr=lr)

    def _to_t(self, x) -> torch.Tensor:
        return torch.tensor(np.array(x), dtype=torch.float32, device=self.device)

    def _get_action_and_log_prob(self, obs: np.ndarray):
        with torch.no_grad():
            t = self._to_t(obs).unsqueeze(0)
            dist, val = self.net(t)
            action = dist.sample()
            log_prob = dist.log_prob(action)
            if self.continuous:
                log_prob = log_prob.sum(dim=-1)
        if self.continuous:
            return action.cpu().numpy()[0], float(log_prob.item()), float(val.item())
        return int(action.item()), float(log_prob.item()), float(val.item())

    def _compute_gae(self, rews, vals, dones, last_val):
        adv = np.zeros_like(rews)
        gae = 0.0
        vals_ext = np.append(vals, last_val)
        for t in reversed(range(len(rews))):
            delta = rews[t] + self.gamma * vals_ext[t + 1] * (1 - dones[t]) - vals_ext[t]
            gae = delta + self.gamma * self.lam * (1 - dones[t]) * gae
            adv[t] = gae
        return adv, adv + vals

    def _ppo_update(self, obs_buf, act_buf, old_lp_buf, ret_buf, adv_buf):
        obs_t = self._to_t(obs_buf)
        ret_t = self._to_t(ret_buf)
        adv_t = self._to_t(adv_buf)
        adv_t = (adv_t - adv_t.mean()) / (adv_t.std() + 1e-8)

        if self.continuous:
            act_t = self._to_t(act_buf)
        else:
            act_t = torch.tensor(act_buf, dtype=torch.long, device=self.device)
        old_lp_t = self._to_t(old_lp_buf)

        n = len(obs_buf)
        for _ in range(self.n_epochs):
            idx = np.random.permutation(n)
            for start in range(0, n, self.batch_size):
                b = idx[start: start + self.batch_size]
                dist, vals = self.net(obs_t[b])
                log_probs = dist.log_prob(act_t[b])
                if self.continuous:
                    log_probs = log_probs.sum(dim=-1)

                ratio = torch.exp(log_probs - old_lp_t[b])
                surr1 = ratio * adv_t[b]
                surr2 = ratio.clamp(1 - self.clip_eps, 1 + self.clip_eps) * adv_t[b]
                actor_loss = -torch.min(surr1, surr2).mean()
                critic_loss = nn.functional.mse_loss(vals, ret_t[b])
                entropy = dist.entropy()
                if self.continuous:
                    entropy = entropy.sum(dim=-1)
                entropy_loss = -entropy.mean()

                loss = actor_loss + self.value_coef * critic_loss + self.entropy_coef * entropy_loss
                self.optimizer.zero_grad()
                loss.backward()
                nn.utils.clip_grad_norm_(self.net.parameters(), 0.5)
                self.optimizer.step()

    @torch.no_grad()
    def _greedy_eval(self, env, episodes: int = 3) -> float:
        """Average return of the greedy policy — used to keep the best
        checkpoint, since PPO here can oscillate / collapse during training."""
        self.net.eval()
        total = 0.0
        for _ in range(episodes):
            obs = env.reset()
            for _ in range(getattr(env, "max_steps", 300)):
                dist, _ = self.net(self._to_t(obs).unsqueeze(0))
                if self.continuous:
                    action = dist.mean.cpu().numpy()[0]
                else:
                    action = int(dist.probs.argmax().item())
                obs, r, done, _ = env.step(action)
                total += r
                if done:
                    break
        self.net.train()
        return total / episodes

    def train(self, env, total_steps: int = 500_000, eval_every: int = 0) -> Dict:
        rewards_per_ep: List[float] = []
        obs = env.reset()
        ep_reward = 0.0

        obs_buf, act_buf, rew_buf, done_buf, val_buf, lp_buf = [], [], [], [], [], []
        step = 0
        best_score = None
        best_state = None
        next_eval = eval_every

        while step < total_steps:
            act, lp, val = self._get_action_and_log_prob(obs)
            next_obs, reward, done, _ = env.step(act)

            obs_buf.append(obs)
            act_buf.append(act if self.continuous else act)
            rew_buf.append(reward)
            done_buf.append(float(done))
            val_buf.append(val)
            lp_buf.append(lp)
            ep_reward += reward
            step += 1

            if done:
                rewards_per_ep.append(ep_reward)
                ep_reward = 0.0
                obs = env.reset()
            else:
                obs = next_obs

            if len(obs_buf) >= self.horizon or (done and len(obs_buf) > 0):
                with torch.no_grad():
                    t = self._to_t(obs).unsqueeze(0)
                    _, last_v = self.net(t)
                    last_val = 0.0 if done else float(last_v.item())
                adv, ret = self._compute_gae(
                    np.array(rew_buf), np.array(val_buf), np.array(done_buf), last_val
                )
                self._ppo_update(obs_buf, act_buf, lp_buf, ret.tolist(), adv.tolist())
                obs_buf, act_buf, rew_buf, done_buf, val_buf, lp_buf = [], [], [], [], [], []

            if eval_every and step >= next_eval:
                next_eval += eval_every
                score = self._greedy_eval(env)
                if best_score is None or score > best_score:
                    best_score = score
                    best_state = {k: v.detach().cpu().clone()
                                  for k, v in self.net.state_dict().items()}
                obs = env.reset()  # eval reset left env mid-episode

        if best_state is not None:
            self.net.load_state_dict(best_state)
        return {"rewards": rewards_per_ep, "best_eval": best_score}

    # ------------------------------------------------------------------ #
    #  Policy/Value maps for GridWorld                                     #
    # ------------------------------------------------------------------ #

    def get_policy_value_maps(self, env) -> Dict:
        self.net.eval()
        policy_map, value_map = [], []
        with torch.no_grad():
            for s in range(env.n_states):
                state = env.idx_to_state(s)
                # Raw state tuple — matches what training fed the network.
                obs = np.array(state, dtype=np.float32)
                t = self._to_t(obs).unsqueeze(0)
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

        max_s = env.max_steps if hasattr(env, "max_steps") else 300
        stall = 0          # consecutive steps with ~no movement (continuous only)
        prev_xy = None
        # Cycle detection for discrete grids (deterministic greedy policy).
        seen = {tuple(obs)} if (not self.continuous and hasattr(env, "n_states")) else None
        for _ in range(max_s):
            with torch.no_grad():
                t = self._to_t(obs).unsqueeze(0)
                dist, val = self.net(t)
                if self.continuous:
                    # Greedy eval uses the distribution mean. But on a *static*
                    # observation a deterministic action that points into a wall
                    # leaves the state unchanged → identical action forever
                    # (deadlock). If we detect a stall, fall back to sampling
                    # from the actual (stochastic) trained policy to break free.
                    if stall >= 3:
                        action = dist.sample().cpu().numpy()[0]
                    else:
                        action = dist.mean.cpu().numpy()[0]
                    log_p = dist.log_prob(self._to_t(action)).sum().item()
                else:
                    action = int(dist.probs.argmax().item())
                    log_p = dist.log_prob(
                        torch.tensor(action, device=self.device)
                    ).item()

            next_state, reward, done, _ = env.step(action)
            if self.continuous:
                xy = (float(next_state[0]), float(next_state[1]))
                if prev_xy is not None:
                    moved = ((xy[0] - prev_xy[0]) ** 2 + (xy[1] - prev_xy[1]) ** 2) ** 0.5
                    stall = stall + 1 if moved < 1e-4 else 0
                prev_xy = xy
            trajectory.append(
                {
                    "state": raw_state.tolist() if hasattr(raw_state, "tolist") else list(raw_state),
                    "action": action.tolist() if hasattr(action, "tolist") else action,
                    "reward": round(reward, 3),
                    "value": round(float(val.item()), 4),
                    "log_prob": round(log_p, 4),
                    "done": done,
                }
            )
            ep_reward += reward
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
            result["trajectory"] = [s["state"][:2] for s in trajectory]
        return result

    def save(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        torch.save(self.net.state_dict(), str(path))

    def load(self, path: Path):
        self.net.load_state_dict(torch.load(str(path), map_location=self.device))
