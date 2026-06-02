import numpy as np
from pathlib import Path
from typing import List, Dict


class SARSAAgent:
    """
    Tabular SARSA (on-policy TD control).
    Structurally identical to Q-Learning except for the on-policy update.
    """

    def __init__(
        self,
        n_states: int,
        n_actions: int,
        alpha: float = 0.1,
        gamma: float = 0.99,
        epsilon: float = 0.1,
    ):
        self.n_states = n_states
        self.n_actions = n_actions
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon

        self.Q = np.zeros((n_states, n_actions), dtype=np.float64)

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
        next_action: int,
        done: bool,
    ):
        # On-policy: use next_action (the one we ACTUALLY take) for bootstrap
        target = reward + (
            0.0 if done else self.gamma * self.Q[next_idx, next_action]
        )
        self.Q[state_idx, action] += self.alpha * (target - self.Q[state_idx, action])

    def get_policy(self) -> List[int]:
        return [int(np.argmax(self.Q[s])) for s in range(self.n_states)]

    def save(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        np.save(str(path), self.Q)

    def load(self, path: Path):
        self.Q = np.load(str(path))

    def train(self, env, n_episodes: int = 5000, snapshot_every: int = 200) -> Dict:
        rewards = []
        snapshots = []

        for ep in range(n_episodes):
            state = env.reset()
            state_idx = env.state_to_idx(state)
            action = self.select_action(state_idx)
            ep_reward = 0.0

            while True:
                next_state, reward, done, _ = env.step(action)
                next_idx = env.state_to_idx(next_state)
                next_action = self.select_action(next_idx)
                self.update(state_idx, action, reward, next_idx, next_action, done)
                state_idx = next_idx
                action = next_action
                ep_reward += reward
                if done:
                    break

            rewards.append(ep_reward)

            if ep % snapshot_every == 0 or ep == n_episodes - 1:
                snapshots.append(
                    {"episode": ep, "q_table": self.Q.tolist()}
                )

        return {"rewards": rewards, "snapshots": snapshots}

    def run_demo(self, env) -> Dict:
        eps_backup = self.epsilon
        self.epsilon = 0.0

        state = env.reset()
        trajectory = []
        ep_reward = 0.0
        seen = {tuple(state)}

        for _ in range(env.max_steps):
            state_idx = env.state_to_idx(state)
            action = self.select_action(state_idx)
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
                trajectory.append(
                    {
                        "state": list(state),
                        "action": action,
                        "reward": 0.0,
                        "done": True,
                    }
                )
                break
            # Greedy policy looping → won't reach goal; stop padding frames.
            key = tuple(next_state)
            if key in seen:
                break
            seen.add(key)

        self.epsilon = eps_backup

        return {
            "episode": trajectory,
            "total_reward": round(ep_reward, 2),
            "q_table": self.Q.tolist(),
            "policy": self.get_policy(),
        }
