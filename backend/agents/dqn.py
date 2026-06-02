import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from collections import deque
import random
from pathlib import Path
from typing import List, Dict, Tuple


def _device() -> torch.device:
    if torch.backends.mps.is_available():
        return torch.device("mps")
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def _clone_state(module: nn.Module) -> dict:
    return {k: v.detach().cpu().clone() for k, v in module.state_dict().items()}


@torch.no_grad()
def greedy_eval_return(agent, env, episodes: int = 5) -> float:
    """Average return of the *greedy* (ε=0) policy. Used to keep the best
    checkpoint during training — DQN on CartPole famously learns a good policy
    then catastrophically forgets it, so the final weights are often worse than
    the best ones seen mid-training."""
    agent.online.eval()
    total = 0.0
    for _ in range(episodes):
        obs = env.reset()
        if hasattr(env, "state_to_obs"):
            obs = env.state_to_obs(obs)
        for _ in range(getattr(env, "max_steps", 500)):
            t = torch.tensor(obs, dtype=torch.float32, device=agent.device).unsqueeze(0)
            action = int(agent.online(t).argmax(dim=1).item())
            ns, r, done, _ = env.step(action)
            obs = env.state_to_obs(ns) if hasattr(env, "state_to_obs") else ns
            total += r
            if done:
                break
    agent.online.train()
    return total / episodes


class QNetwork(nn.Module):
    def __init__(self, obs_dim: int, n_actions: int, hidden: int = 128):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(obs_dim, hidden),
            nn.ReLU(),
            nn.Linear(hidden, hidden),
            nn.ReLU(),
            nn.Linear(hidden, n_actions),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class ReplayBuffer:
    def __init__(self, capacity: int = 50_000):
        self.buf = deque(maxlen=capacity)

    def push(self, *transition):
        self.buf.append(transition)

    def sample(self, batch_size: int):
        return random.sample(self.buf, batch_size)

    def __len__(self):
        return len(self.buf)


class DQNAgent:
    def __init__(
        self,
        obs_dim: int,
        n_actions: int,
        lr: float = 1e-3,
        gamma: float = 0.99,
        epsilon_start: float = 1.0,
        epsilon_end: float = 0.01,
        epsilon_decay: int = 2000,
        buffer_size: int = 50_000,
        batch_size: int = 64,
        target_update: int = 200,
    ):
        self.obs_dim = obs_dim
        self.n_actions = n_actions
        self.gamma = gamma
        self.epsilon_start = epsilon_start
        self.epsilon_end = epsilon_end
        self.epsilon_decay = epsilon_decay
        self.batch_size = batch_size
        self.target_update = target_update

        self.device = _device()
        self.online = QNetwork(obs_dim, n_actions).to(self.device)
        self.target = QNetwork(obs_dim, n_actions).to(self.device)
        self.target.load_state_dict(self.online.state_dict())
        self.target.eval()

        self.optimizer = optim.Adam(self.online.parameters(), lr=lr)
        self.buffer = ReplayBuffer(buffer_size)
        self.steps = 0

    @property
    def epsilon(self) -> float:
        frac = min(self.steps / max(self.epsilon_decay, 1), 1.0)
        return self.epsilon_start + frac * (self.epsilon_end - self.epsilon_start)

    def select_action(self, obs: np.ndarray) -> int:
        if np.random.random() < self.epsilon:
            return np.random.randint(self.n_actions)
        with torch.no_grad():
            t = torch.tensor(obs, dtype=torch.float32, device=self.device).unsqueeze(0)
            return int(self.online(t).argmax(dim=1).item())

    def _learn(self):
        if len(self.buffer) < self.batch_size:
            return
        batch = self.buffer.sample(self.batch_size)
        obs, acts, rews, next_obs, dones = zip(*batch)

        obs_t = torch.tensor(np.array(obs), dtype=torch.float32, device=self.device)
        acts_t = torch.tensor(acts, dtype=torch.long, device=self.device)
        rews_t = torch.tensor(rews, dtype=torch.float32, device=self.device)
        next_t = torch.tensor(np.array(next_obs), dtype=torch.float32, device=self.device)
        dones_t = torch.tensor(dones, dtype=torch.float32, device=self.device)

        q_vals = self.online(obs_t).gather(1, acts_t.unsqueeze(1)).squeeze(1)
        with torch.no_grad():
            next_q = self.target(next_t).max(1)[0]
            targets = rews_t + self.gamma * next_q * (1 - dones_t)

        loss = nn.functional.smooth_l1_loss(q_vals, targets)
        self.optimizer.zero_grad()
        loss.backward()
        nn.utils.clip_grad_norm_(self.online.parameters(), 10.0)
        self.optimizer.step()

        if self.steps % self.target_update == 0:
            self.target.load_state_dict(self.online.state_dict())

    def train(self, env, n_episodes: int = 1500,
              eval_every: int = 0, eval_episodes: int = 5) -> Dict:
        rewards = []
        best_score = None
        best_state = None
        for ep in range(n_episodes):
            obs = env.reset()
            if hasattr(env, "state_to_obs"):
                obs = env.state_to_obs(obs)
            ep_reward = 0.0
            while True:
                action = self.select_action(obs)
                next_state, reward, done, _ = env.step(action)
                next_obs = (
                    env.state_to_obs(next_state)
                    if hasattr(env, "state_to_obs")
                    else next_state
                )
                self.buffer.push(obs, action, reward, next_obs, done)
                self._learn()
                self.steps += 1
                obs = next_obs
                ep_reward += reward
                if done:
                    break
            rewards.append(ep_reward)

            # Keep the best greedy checkpoint (guards against forgetting).
            if eval_every and (ep + 1) % eval_every == 0:
                score = greedy_eval_return(self, env, eval_episodes)
                if best_score is None or score > best_score:
                    best_score = score
                    best_state = _clone_state(self.online)

        if best_state is not None:
            self.online.load_state_dict(best_state)
            self.target.load_state_dict(best_state)
        return {"rewards": rewards, "best_eval": best_score}

    # ------------------------------------------------------------------ #
    #  Q-value map for GridWorld (query all cells)                         #
    # ------------------------------------------------------------------ #

    def get_q_map(self, env) -> List[List[float]]:
        self.online.eval()
        q_map = []
        with torch.no_grad():
            for s in range(env.n_states):
                state = env.idx_to_state(s)
                obs = env.state_to_obs(state)
                t = torch.tensor(obs, dtype=torch.float32, device=self.device).unsqueeze(0)
                q = self.online(t).cpu().numpy()[0].tolist()
                q_map.append(q)
        self.online.train()
        return q_map

    def run_demo(self, env) -> Dict:
        self.online.eval()
        obs = env.reset()
        raw_state = obs
        if hasattr(env, "state_to_obs"):
            obs = env.state_to_obs(obs)
        trajectory = []
        ep_reward = 0.0
        # Cycle detection for discrete grids (greedy policy is deterministic).
        seen = {tuple(raw_state)} if hasattr(env, "n_states") else None

        for _ in range(env.max_steps):
            with torch.no_grad():
                t = torch.tensor(obs, dtype=torch.float32, device=self.device).unsqueeze(0)
                q_vals = self.online(t).cpu().numpy()[0]
            action = int(np.argmax(q_vals))
            next_state, reward, done, _ = env.step(action)
            next_obs = (
                env.state_to_obs(next_state)
                if hasattr(env, "state_to_obs")
                else next_state
            )
            trajectory.append(
                {
                    "state": raw_state.tolist() if hasattr(raw_state, "tolist") else list(raw_state),
                    "action": action,
                    "reward": round(reward, 3),
                    "q_values": [round(float(v), 4) for v in q_vals],
                    "done": done,
                }
            )
            ep_reward += reward
            obs = next_obs
            raw_state = next_state
            if done:
                ns = next_state.tolist() if hasattr(next_state, "tolist") else list(next_state)
                trajectory.append({"state": ns, "action": action, "reward": 0.0,
                                    "q_values": [round(float(v), 4) for v in q_vals], "done": True})
                break
            if seen is not None:
                key = tuple(next_state)
                if key in seen:
                    break
                seen.add(key)

        self.online.train()
        result = {"episode": trajectory, "total_reward": round(ep_reward, 2)}
        if hasattr(env, "n_states"):
            result["q_map"] = self.get_q_map(env)
            result["policy"] = [int(np.argmax(q)) for q in result["q_map"]]
        return result

    def save(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        torch.save(self.online.state_dict(), str(path))

    def load(self, path: Path):
        state = torch.load(str(path), map_location=self.device)
        self.online.load_state_dict(state)
        self.target.load_state_dict(state)
