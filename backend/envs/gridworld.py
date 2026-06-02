import numpy as np
from typing import Optional, Tuple, List, Dict, Set


class GridWorld:
    """
    Configurable grid world. Supports standard goal-reaching and cliff-walking.
    Actions: 0=up, 1=right, 2=down, 3=left
    """

    DELTAS = {0: (-1, 0), 1: (0, 1), 2: (1, 0), 3: (0, -1)}
    ACTION_NAMES = ["up", "right", "down", "left"]

    def __init__(
        self,
        rows: int = 6,
        cols: int = 6,
        start: Tuple[int, int] = (0, 0),
        goal: Optional[Tuple[int, int]] = None,
        walls: Optional[List[Tuple[int, int]]] = None,
        cliff_cells: Optional[List[Tuple[int, int]]] = None,
        step_reward: float = -1.0,
        goal_reward: float = 20.0,
        cliff_reward: float = -100.0,
        max_steps: int = 200,
    ):
        self.rows = rows
        self.cols = cols
        self.start = tuple(start)
        self.goal = tuple(goal) if goal else (rows - 1, cols - 1)
        self.walls: Set[Tuple[int, int]] = set(map(tuple, walls)) if walls else set()
        self.cliff_cells: Set[Tuple[int, int]] = (
            set(map(tuple, cliff_cells)) if cliff_cells else set()
        )
        self.step_reward = step_reward
        self.goal_reward = goal_reward
        self.cliff_reward = cliff_reward
        self.max_steps = max_steps

        self.n_states = rows * cols
        self.n_actions = 4
        self._state: Tuple[int, int] = self.start
        self._steps = 0

    # ------------------------------------------------------------------ #
    #  State encoding                                                      #
    # ------------------------------------------------------------------ #

    def state_to_idx(self, state: Tuple[int, int]) -> int:
        return state[0] * self.cols + state[1]

    def idx_to_state(self, idx: int) -> Tuple[int, int]:
        return (idx // self.cols, idx % self.cols)

    def state_to_obs(self, state: Tuple[int, int]) -> np.ndarray:
        """Normalised (row, col) for neural-network input."""
        r, c = state
        return np.array(
            [r / max(self.rows - 1, 1), c / max(self.cols - 1, 1)], dtype=np.float32
        )

    # ------------------------------------------------------------------ #
    #  Gym-like interface                                                  #
    # ------------------------------------------------------------------ #

    def reset(self) -> Tuple[int, int]:
        self._state = self.start
        self._steps = 0
        return self._state

    def step(self, action: int) -> Tuple[Tuple[int, int], float, bool, Dict]:
        r, c = self._state
        dr, dc = self.DELTAS[action]
        nr, nc = r + dr, c + dc

        if (
            0 <= nr < self.rows
            and 0 <= nc < self.cols
            and (nr, nc) not in self.walls
        ):
            self._state = (nr, nc)

        self._steps += 1

        if self._state in self.cliff_cells:
            self._state = self.start
            return self._state, self.cliff_reward, False, {"cliff": True}

        if self._state == self.goal:
            return self._state, self.goal_reward, True, {}

        done = self._steps >= self.max_steps
        return self._state, self.step_reward, done, {}

    # ------------------------------------------------------------------ #
    #  Config export (for API / frontend)                                  #
    # ------------------------------------------------------------------ #

    def get_config(self) -> Dict:
        return {
            "rows": self.rows,
            "cols": self.cols,
            "start": list(self.start),
            "goal": list(self.goal),
            "walls": [list(w) for w in sorted(self.walls)],
            "cliff_cells": [list(c) for c in sorted(self.cliff_cells)],
        }


# ------------------------------------------------------------------ #
#  Factory helpers                                                     #
# ------------------------------------------------------------------ #

def make_gridworld() -> GridWorld:
    """6×6 grid with several wall cells."""
    walls = [(1, 1), (1, 2), (1, 3), (2, 4), (3, 1), (3, 2), (4, 3), (4, 4)]
    return GridWorld(rows=6, cols=6, walls=walls, max_steps=200)


def make_cliff_walking() -> GridWorld:
    """Classic 4×12 cliff-walking problem."""
    cliff = [(3, c) for c in range(1, 11)]
    return GridWorld(
        rows=4,
        cols=12,
        start=(3, 0),
        goal=(3, 11),
        cliff_cells=cliff,
        step_reward=-1.0,
        goal_reward=0.0,
        cliff_reward=-100.0,
        max_steps=500,
    )
