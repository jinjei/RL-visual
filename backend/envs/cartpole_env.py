import numpy as np
import gymnasium as gym
from typing import Tuple, Dict


class CartPoleEnv:
    """Thin wrapper around gymnasium CartPole-v1."""

    def __init__(self):
        self._env = gym.make("CartPole-v1")
        self.n_actions = 2
        self.obs_dim = 4
        self.max_steps = 500
        self._state: np.ndarray = np.zeros(4, dtype=np.float32)

    def reset(self) -> np.ndarray:
        obs, _ = self._env.reset()
        self._state = obs.astype(np.float32)
        return self._state

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, Dict]:
        obs, reward, terminated, truncated, info = self._env.step(action)
        self._state = obs.astype(np.float32)
        done = terminated or truncated
        return self._state, float(reward), done, info

    def get_config(self) -> Dict:
        return {
            "type": "cartpole",
            "obs_dim": self.obs_dim,
            "n_actions": self.n_actions,
            "action_names": ["push left", "push right"],
            "obs_names": ["position", "velocity", "pole angle", "angular velocity"],
        }
