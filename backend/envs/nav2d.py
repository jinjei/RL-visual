import numpy as np
from typing import Tuple, List, Dict, Optional


class Nav2DEnv:
    """
    2-D continuous navigation.
    State:  [x, y, vx, vy, dx_goal, dy_goal]   (6-dim)
    Action: [ax, ay]  in [-1, 1]²  (continuous acceleration)
    """

    def __init__(
        self,
        obstacles: Optional[List[Dict]] = None,
        goal: Optional[Dict] = None,
        max_speed: float = 0.05,
        max_steps: int = 300,
        dt: float = 0.05,
        seed: int = 42,
    ):
        self.obs_dim = 6
        self.action_dim = 2
        self.max_speed = max_speed
        self.max_steps = max_steps
        self.dt = dt
        self.rng = np.random.default_rng(seed)

        self.goal = goal or {"cx": 0.85, "cy": 0.85, "r": 0.07}
        self.obstacles: List[Dict] = obstacles or [
            {"cx": 0.35, "cy": 0.55, "r": 0.08},
            {"cx": 0.65, "cy": 0.30, "r": 0.08},
            {"cx": 0.50, "cy": 0.70, "r": 0.07},
        ]

        self._x = 0.1
        self._y = 0.1
        self._vx = 0.0
        self._vy = 0.0
        self._steps = 0

    # ------------------------------------------------------------------ #

    def _obs(self) -> np.ndarray:
        dx = self.goal["cx"] - self._x
        dy = self.goal["cy"] - self._y
        return np.array(
            [self._x, self._y, self._vx, self._vy, dx, dy], dtype=np.float32
        )

    def _in_obstacle(self, x: float, y: float) -> bool:
        for ob in self.obstacles:
            if (x - ob["cx"]) ** 2 + (y - ob["cy"]) ** 2 < ob["r"] ** 2:
                return True
        return False

    def _at_goal(self, x: float, y: float) -> bool:
        g = self.goal
        return (x - g["cx"]) ** 2 + (y - g["cy"]) ** 2 < g["r"] ** 2

    def reset(self) -> np.ndarray:
        # Start in bottom-left quadrant, away from obstacles
        for _ in range(1000):
            x = self.rng.uniform(0.05, 0.25)
            y = self.rng.uniform(0.05, 0.25)
            if not self._in_obstacle(x, y):
                break
        self._x, self._y = x, y
        self._vx, self._vy = 0.0, 0.0
        self._steps = 0
        return self._obs()

    def step(self, action: np.ndarray) -> Tuple[np.ndarray, float, bool, Dict]:
        gx, gy = self.goal["cx"], self.goal["cy"]
        # Distance BEFORE moving — basis for potential-based shaping.
        old_dist = np.sqrt((self._x - gx) ** 2 + (self._y - gy) ** 2)

        ax, ay = np.clip(action, -1.0, 1.0)

        self._vx = np.clip(self._vx + ax * self.dt, -self.max_speed, self.max_speed)
        self._vy = np.clip(self._vy + ay * self.dt, -self.max_speed, self.max_speed)

        nx = np.clip(self._x + self._vx, 0.0, 1.0)
        ny = np.clip(self._y + self._vy, 0.0, 1.0)

        hit_wall = (nx == 0.0 or nx == 1.0 or ny == 0.0 or ny == 1.0)
        hit_obs = self._in_obstacle(nx, ny)

        if hit_obs or hit_wall:
            self._vx = 0.0
            self._vy = 0.0
            if not hit_wall:
                nx, ny = self._x, self._y

        self._x, self._y = nx, ny
        self._steps += 1

        new_dist = np.sqrt((nx - gx) ** 2 + (ny - gy) ** 2)

        # Potential-based shaping: reward *progress* toward the goal, not the
        # absolute distance. Telescopes to (start_dist − end_dist), so it does
        # not punish the temporary detour needed to get around an obstacle.
        # A small per-step penalty nudges the agent to finish promptly.
        reward = (old_dist - new_dist) * 10.0 - 0.01

        done = False
        info: Dict = {}
        if self._at_goal(nx, ny):
            reward += 20.0
            done = True
            info["success"] = True
        elif hit_obs:
            reward -= 5.0
            info["collision"] = True
        elif hit_wall:
            # Small penalty for pressing into a boundary wall. Without this the
            # agent can ride/oscillate along an edge for free, which is the
            # classic "stuck in the corner" failure mode.
            reward -= 0.5
            info["wall"] = True

        if self._steps >= self.max_steps:
            done = True

        return self._obs(), float(reward), done, info

    def get_config(self) -> Dict:
        return {
            "type": "nav2d",
            "obstacles": self.obstacles,
            "goal": self.goal,
            "bounds": [0.0, 1.0, 0.0, 1.0],
            "obs_dim": self.obs_dim,
            "action_dim": self.action_dim,
        }
