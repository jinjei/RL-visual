import numpy as np
import json
from pathlib import Path
from typing import List, Dict, Tuple


class QLearningAgent:
    """
    Tabular Q-Learning (off-policy TD control).
    Stores Q-table snapshots during training for visualization.
    """

    def __init__(
        self,
        n_states: int,
        n_actions: int,
        alpha: float = 0.1,
        gamma: float = 0.99,
        epsilon_start: float = 1.0,
        epsilon_end: float = 0.01,
        epsilon_decay_episodes: int = 4000,
    ):
        self.n_states = n_states
        self.n_actions = n_actions
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon_start = epsilon_start
        self.epsilon_end = epsilon_end
        self.epsilon_decay_episodes = epsilon_decay_episodes

        self.Q = np.zeros((n_states, n_actions), dtype=np.float64)
        self.episode = 0

    @property
    def epsilon(self) -> float:
        frac = min(self.episode / max(self.epsilon_decay_episodes, 1), 1.0)
        return self.epsilon_start + frac * (self.epsilon_end - self.epsilon_start)

    def select_action(self, state_idx: int) -> int:
        if np.random.random() < self.epsilon:
            return np.random.randint(self.n_actions)
        return int(np.argmax(self.Q[state_idx]))

    def update(
        self,
        state_idx: int,
        action: int,
        reward: float,
        next_idx: int,
        done: bool,
    ):
        target = reward + (0.0 if done else self.gamma * np.max(self.Q[next_idx]))
        self.Q[state_idx, action] += self.alpha * (target - self.Q[state_idx, action])

    def get_policy(self) -> List[int]:
        return [int(np.argmax(self.Q[s])) for s in range(self.n_states)]

    def save(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        np.save(str(path), self.Q)

    def load(self, path: Path):
        self.Q = np.load(str(path))

    # ------------------------------------------------------------------ #
    #  Training with snapshot collection                                   #
    # ------------------------------------------------------------------ #

    def train(
        self,
        env,
        n_episodes: int = 5000,
        snapshot_every: int = 200,
    ) -> Dict:
        rewards = []
        snapshots: List[Dict] = []

        for ep in range(n_episodes):
            state = env.reset()
            state_idx = env.state_to_idx(state)
            ep_reward = 0.0

            while True:
                action = self.select_action(state_idx)
                next_state, reward, done, _ = env.step(action)
                next_idx = env.state_to_idx(next_state)
                self.update(state_idx, action, reward, next_idx, done)
                state_idx = next_idx
                ep_reward += reward
                if done:
                    break

            rewards.append(ep_reward)
            self.episode += 1

            if ep % snapshot_every == 0 or ep == n_episodes - 1:
                snapshots.append(
                    {
                        "episode": ep,
                        "q_table": self.Q.tolist(),
                        "epsilon": round(self.epsilon, 4),
                    }
                )

        return {"rewards": rewards, "snapshots": snapshots}

    # ------------------------------------------------------------------ #
    #  Demo episode with trained policy                                    #
    # ------------------------------------------------------------------ #

    def run_demo(self, env) -> Dict:
        state = env.reset()
        trajectory = []
        ep_reward = 0.0
        seen = {tuple(state)}

        for _ in range(env.max_steps):
            state_idx = env.state_to_idx(state)
            # Truly greedy: take argmax(Q) directly. (Going through
            # select_action would honour the ε floor — the epsilon formula
            # returns epsilon_end, not 0, at full decay — so the robot would
            # take ~ε random steps and visibly drift off the displayed arrows,
            # often tripping the cycle-detector short of the goal. Using argmax
            # guarantees the demo path matches get_policy() exactly.)
            action = int(np.argmax(self.Q[state_idx]))
            next_state, reward, done, info = env.step(action)
            trajectory.append(
                {
                    "state": list(state),
                    "action": action,
                    "reward": round(reward, 3),
                    "done": done,
                }
            )
            ep_reward += reward
            state = next_state
            if done:
                # Append terminal state so agent visually arrives at the goal
                trajectory.append(
                    {
                        "state": list(state),
                        "action": action,
                        "reward": 0.0,
                        "done": True,
                    }
                )
                break
            # Greedy policy is deterministic: revisiting a state means it is
            # looping (or stuck against a wall) and will never reach the goal.
            # Stop here so the demo ends promptly instead of padding ~200
            # identical frames.
            key = tuple(next_state)
            if key in seen:
                break
            seen.add(key)

        return {
            "episode": trajectory,
            "total_reward": round(ep_reward, 2),
            "q_table": self.Q.tolist(),
            "policy": self.get_policy(),
        }
