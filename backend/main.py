"""
FastAPI backend — serves pre-trained RL agent demos.
Run: uvicorn main:app --reload --port 8000
"""

import json
import numpy as np
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

ROOT = Path(__file__).parent
WEIGHTS = ROOT / "weights"
DATA = ROOT / "training_data"

app = FastAPI(title="RL Visualizer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------ #
#  Lazy model cache                                                    #
# ------------------------------------------------------------------ #

_cache: Dict[str, Any] = {}


def _load_q_table(name: str) -> np.ndarray:
    path = WEIGHTS / f"{name}.npy"
    if not path.exists():
        raise HTTPException(404, f"Weights not found: {path.name}. Run train.py first.")
    return np.load(str(path))


def _load_torch_agent(cls, path_name: str, **kwargs):
    import torch
    path = WEIGHTS / path_name
    if not path.exists():
        raise HTTPException(404, f"Weights not found: {path.name}. Run train.py first.")
    agent = cls(**kwargs)
    agent.load(path)
    return agent


def _read_json(path: Path) -> Any:
    if not path.exists():
        return None
    return json.loads(path.read_text())


# ------------------------------------------------------------------ #
#  Helper: build env + agent pairs                                     #
# ------------------------------------------------------------------ #

def _get_tabular(algo: str, env_name: str):
    from envs import make_gridworld, make_cliff_walking
    from agents import QLearningAgent, SARSAAgent

    env = make_cliff_walking() if env_name == "cliff" else make_gridworld()
    key = f"{algo}_{env_name}"

    if key not in _cache:
        Q = _load_q_table(key)
        if algo == "q_learning":
            agent = QLearningAgent(env.n_states, env.n_actions)
        else:
            agent = SARSAAgent(env.n_states, env.n_actions)
        agent.Q = Q
        _cache[key] = agent

    return env, _cache[key]


def _get_dqn(env_name: str):
    from envs import make_gridworld, CartPoleEnv
    from agents import DQNAgent

    if env_name == "cartpole":
        env = CartPoleEnv()
        key = "dqn_cartpole"
        if key not in _cache:
            _cache[key] = _load_torch_agent(DQNAgent, "dqn_cartpole.pt", obs_dim=4, n_actions=2)
    else:
        env = make_gridworld()
        key = "dqn_gridworld"
        if key not in _cache:
            _cache[key] = _load_torch_agent(DQNAgent, "dqn_gridworld.pt", obs_dim=2, n_actions=4)
    return env, _cache[key]


def _get_dueling(env_name: str):
    from envs import make_gridworld, CartPoleEnv
    from agents import DuelingDQNAgent

    if env_name == "cartpole":
        env = CartPoleEnv()
        key = "dueling_cartpole"
        if key not in _cache:
            _cache[key] = _load_torch_agent(
                DuelingDQNAgent, "dueling_dqn_cartpole.pt", obs_dim=4, n_actions=2
            )
    else:
        env = make_gridworld()
        key = "dueling_gridworld"
        if key not in _cache:
            _cache[key] = _load_torch_agent(
                DuelingDQNAgent, "dueling_dqn_gridworld.pt", obs_dim=2, n_actions=4
            )
    return env, _cache[key]


def _get_a2c(env_name: str):
    from envs import make_gridworld, Nav2DEnv
    from agents import A2CAgent

    if env_name == "nav2d":
        env = Nav2DEnv()
        key = "a2c_nav2d"
        if key not in _cache:
            _cache[key] = _load_torch_agent(
                A2CAgent, "a2c_nav2d.pt", obs_dim=6, n_actions=2, continuous=True
            )
    else:
        env = make_gridworld()
        key = "a2c_gridworld"
        if key not in _cache:
            _cache[key] = _load_torch_agent(
                A2CAgent, "a2c_gridworld.pt", obs_dim=2, n_actions=4, continuous=False
            )
    return env, _cache[key]


def _get_ppo(env_name: str):
    from envs import make_gridworld, Nav2DEnv
    from agents import PPOAgent

    if env_name == "nav2d":
        env = Nav2DEnv()
        key = "ppo_nav2d"
        if key not in _cache:
            _cache[key] = _load_torch_agent(
                PPOAgent, "ppo_nav2d.pt", obs_dim=6, n_actions=2, continuous=True
            )
    else:
        env = make_gridworld()
        key = "ppo_gridworld"
        if key not in _cache:
            _cache[key] = _load_torch_agent(
                PPOAgent, "ppo_gridworld.pt", obs_dim=2, n_actions=4, continuous=False
            )
    return env, _cache[key]


# ------------------------------------------------------------------ #
#  Routes                                                              #
# ------------------------------------------------------------------ #

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/demo/{algo}/{env_name}")
def demo(algo: str, env_name: str):
    """
    Run one demo episode with the pre-trained agent.
    Returns full trajectory + visualization data.
    """
    try:
        if algo == "q_learning":
            env, agent = _get_tabular("q_learning", env_name)
        elif algo == "sarsa":
            env, agent = _get_tabular("sarsa", env_name)
        elif algo == "dqn":
            env, agent = _get_dqn(env_name)
        elif algo == "dueling_dqn":
            env, agent = _get_dueling(env_name)
        elif algo == "a2c":
            env, agent = _get_a2c(env_name)
        elif algo == "ppo":
            env, agent = _get_ppo(env_name)
        else:
            raise HTTPException(400, f"Unknown algorithm: {algo}")
        demo_data = agent.run_demo(env)
        demo_data["env_config"] = env.get_config()
        return demo_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/api/training/{algo}/{env_name}")
def training_curves(algo: str, env_name: str):
    """Return training reward curve (smoothed + raw)."""
    path = DATA / f"{algo}_{env_name}_rewards.json"
    data = _read_json(path)
    if data is None:
        raise HTTPException(404, "Training data not found. Run train.py first.")
    return data


@app.get("/api/snapshots/{algo}/{env_name}")
def snapshots(algo: str, env_name: str):
    """Return Q-table snapshots during training (tabular methods only)."""
    path = DATA / f"{algo}_{env_name}_snapshots.json"
    data = _read_json(path)
    if data is None:
        raise HTTPException(404, "Snapshot data not found. Run train.py first.")
    return data


class GridTrainRequest(BaseModel):
    algo: str = "q_learning"
    rows: int = 6
    cols: int = 6
    start: list = [0, 0]
    goal: list = [5, 5]
    walls: list = []
    # User-tunable hyperparameters
    alpha: float = 0.1        # learning rate
    gamma: float = 0.99       # discount factor
    epsilon: float = 0.1      # exploration (SARSA: fixed; Q-learning: floor)
    episodes: int = 3000


def _build_grid(req: GridTrainRequest):
    """Validate a user layout + hyperparameters → (env, agent, episodes)."""
    from envs.gridworld import GridWorld
    from agents import QLearningAgent, SARSAAgent

    if not (2 <= req.rows <= 10 and 2 <= req.cols <= 10):
        raise HTTPException(400, "Grid size must be between 2×2 and 10×10.")
    if not (0.001 <= req.alpha <= 1.0):
        raise HTTPException(400, "Learning rate α must be in (0, 1].")
    if not (0.0 <= req.gamma < 1.0):
        raise HTTPException(400, "Discount γ must be in [0, 1).")
    if not (0.0 <= req.epsilon <= 1.0):
        raise HTTPException(400, "Exploration ε must be in [0, 1].")
    episodes = max(50, min(int(req.episodes), 8000))

    walls = {tuple(w) for w in req.walls}
    start = tuple(req.start)
    goal = tuple(req.goal)
    for cell, label in [(start, "Start"), (goal, "Goal")]:
        if not (0 <= cell[0] < req.rows and 0 <= cell[1] < req.cols):
            raise HTTPException(400, f"{label} is outside the grid.")
    if start in walls:
        raise HTTPException(400, "Start cell sits on a wall.")
    if goal in walls:
        raise HTTPException(400, "Goal cell sits on a wall.")
    if start == goal:
        raise HTTPException(400, "Start and goal must be different cells.")

    env = GridWorld(
        rows=req.rows, cols=req.cols, start=start, goal=goal,
        walls=[list(w) for w in walls], max_steps=200,
    )
    if req.algo == "sarsa":
        agent = SARSAAgent(
            env.n_states, env.n_actions,
            alpha=req.alpha, gamma=req.gamma, epsilon=req.epsilon,
        )
    else:
        agent = QLearningAgent(
            env.n_states, env.n_actions,
            alpha=req.alpha, gamma=req.gamma,
            epsilon_start=1.0, epsilon_end=req.epsilon,
            epsilon_decay_episodes=max(1, episodes // 2),
        )
    return env, agent, episodes


def _q_to_maps(Q: np.ndarray, n_states: int):
    """Greedy policy + max-Q heatmap from a Q-table."""
    policy = [int(np.argmax(Q[s])) for s in range(n_states)]
    heatmap = [round(float(np.max(Q[s])), 3) for s in range(n_states)]
    return policy, heatmap


def _curve_convergence_episode(rewards) -> int:
    """First episode where the *smoothed* reward curve reaches its final plateau.

    Used to decide how long the "watch it learn" animation should run: we keep
    every frame up to this episode so the playhead follows the whole climb,
    instead of stopping at the last greedy-policy change (which happens much
    earlier than the curve flattens).
    """
    n = len(rewards)
    if n < 4:
        return max(0, n - 1)
    w = min(50, max(1, n // 20))
    sm = [float(np.mean(rewards[max(0, i - w + 1): i + 1])) for i in range(n)]
    final = float(np.mean(sm[-max(1, n // 10):]))
    band = 0.05 * abs(final) + 0.5
    for i in range(n):
        if sm[i] >= final - band:
            return i
    return n - 1


def _heatmap_changed(heat, prev, tol: float = 0.03) -> bool:
    """True if any cell's max-Q value shifted by more than `tol` (relative to
    the current value scale) since the previous kept frame. Used to decide
    whether a snapshot is visibly different enough to be its own animation frame.
    """
    if prev is None:
        return True
    h = np.asarray(heat, dtype=float)
    p = np.asarray(prev, dtype=float)
    scale = max(float(np.abs(h).max()), 1e-6)
    return float(np.abs(h - p).max()) / scale > tol


def _downsample(arr, n=160):
    if len(arr) <= n:
        return [round(float(x), 2) for x in arr]
    idx = np.linspace(0, len(arr) - 1, n).astype(int)
    return [round(float(arr[i]), 2) for i in idx]


@app.post("/api/gridworld/train")
def gridworld_train(req: GridTrainRequest):
    """
    Train a fresh tabular agent on a user-designed grid layout, on the fly.
    Tabular Q-Learning/SARSA on a small grid converges in well under a second,
    so editing walls/start/goal and retraining feels instant — no GPU, no
    pre-baked weights. (Tabular methods have no generalization, so a *new*
    layout genuinely requires a new Q-table; here that retrain is the demo.)
    """
    try:
        env, agent, episodes = _build_grid(req)
        agent.train(env, n_episodes=episodes, snapshot_every=10_000_000)
        demo = agent.run_demo(env)
        demo["env_config"] = env.get_config()
        last = demo["episode"][-1]["state"] if demo["episode"] else None
        demo["reached_goal"] = bool(last is not None and list(last) == list(env.goal))
        return demo
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/gridworld/train_live")
def gridworld_train_live(req: GridTrainRequest):
    """
    Train a fresh tabular agent and return policy/value SNAPSHOTS sampled across
    training, so the frontend can animate the policy *converging* episode by
    episode (the "watch it learn" view). Hyperparameters (α, γ, ε, episodes)
    come from the request, letting users see how tuning changes how fast/cleanly
    the policy emerges.

    Nothing here is a fixed frame count — both the animation length and its
    resolution adapt to the layout:

    1. We first train once just to find `conv_ep`, the episode where THIS map's
       reward curve flattens (depends on grid size, walls, α/γ/ε). Tabular
       training is sub-second, so a throwaway pass is cheap.
    2. We then replay the *learning window* [0, conv_ep] and snapshot it at a
       cadence sized to that window (~70 frames across the climb) — not at a
       fixed fraction of the total episode count. So whether a layout converges
       in 40 episodes or 3000, and regardless of how many total episodes the
       user dialed in, the animation is well-sampled. (Same RNG seed → the
       replay is identical to the first pass, so the snapshots line up with the
       curve we return.)
    3. We then keep a frame only when something visibly changes — the greedy
       policy (an arrow flips) or the value heatmap (a cell's colour shifts by
       more than a few percent) — and always keep the last frame. So the frame
       COUNT is itself dynamic: a layout whose policy snaps into place in a few
       episodes yields a short animation; one that refines slowly over thousands
       of episodes yields a long one. Nothing is pinned to a constant.

    The demo (moving agent) is run from the fully-trained policy of pass 1, and
    its path length is itself dynamic — it runs until the agent reaches the goal.
    """
    try:
        # --- Pass 1: full training → reward curve, final policy, conv_ep ----- #
        env, agent, episodes = _build_grid(req)
        seed = int(np.random.randint(1_000_000_000))
        np.random.seed(seed)
        rewards = agent.train(
            env, n_episodes=episodes, snapshot_every=episodes + 1
        )["rewards"]
        conv_ep = _curve_convergence_episode(rewards)

        def smoothed_at(ep, window=50):
            seg = rewards[max(0, ep - window): ep + 1]
            return round(float(np.mean(seg)), 2) if seg else 0.0

        # --- Pass 2: replay the learning window, sampled finely to fit it ---- #
        # Replay a little past convergence so the curve is seen settling, then
        # stops. Cadence scales with the window (≤ ~150 raw snapshots) so a fast
        # or slow convergence is equally well resolved, regardless of the total
        # episode budget the user picked.
        tail = max(5, conv_ep // 5)
        anim_eps = min(episodes, conv_ep + tail + 1)
        # ~150 raw snapshots across the window (ceil div so a short window isn't
        # sampled every single episode — that would let per-episode value jitter,
        # e.g. SARSA's on-policy noise, survive the change-dedup as 100s of frames).
        cadence = max(1, (anim_eps + 149) // 150)
        env2, agent2, _ = _build_grid(req)
        np.random.seed(seed)  # identical trajectory to pass 1
        snaps = agent2.train(
            env2, n_episodes=anim_eps, snapshot_every=cadence
        )["snapshots"]

        frames = []
        prev_policy = None
        prev_heat = None
        for i, snap in enumerate(snaps):
            policy, heatmap = _q_to_maps(np.array(snap["q_table"]), env2.n_states)
            # Keep a frame only when the policy or the value heatmap visibly
            # changed (and always the final one, so the playhead reaches the
            # plateau). This makes the frame count track real learning, not a
            # fixed cadence.
            changed = (
                policy != prev_policy
                or _heatmap_changed(heatmap, prev_heat)
                or i == len(snaps) - 1
            )
            if not changed:
                continue
            prev_policy = policy
            prev_heat = heatmap
            frames.append({
                "episode": snap["episode"],
                "policy": policy,
                "heatmap": heatmap,
                "epsilon": snap.get("epsilon"),
                "avg_reward": smoothed_at(snap["episode"]),
            })

        # Upper bound so a noisy run (e.g. SARSA's fixed-ε jitter) can't produce
        # an unwieldy animation. Uniform subsample, always keeping first + last.
        MAX_FRAMES = 150
        if len(frames) > MAX_FRAMES:
            idx = np.linspace(0, len(frames) - 1, MAX_FRAMES).astype(int)
            frames = [frames[i] for i in sorted(set(idx.tolist()))]

        demo = agent.run_demo(env)
        last = demo["episode"][-1]["state"] if demo["episode"] else None
        reached = bool(last is not None and list(last) == list(env.goal))

        return {
            "env_config": env.get_config(),
            "total_episodes": episodes,
            "frames": frames,
            "reward_curve": _downsample(rewards),
            "final": {
                "episode": demo["episode"],
                "total_reward": demo["total_reward"],
                "policy": demo["policy"],
                "q_table": demo["q_table"],
                "reached_goal": reached,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/api/algorithms")
def algorithms():
    """Metadata for all algorithms."""
    return [
        {
            "id": "q_learning",
            "name": "Q-Learning",
            "chapter": 1,
            "type": "tabular",
            "color": "#f59e0b",
            "envs": ["gridworld", "cliff"],
            "tagline": "Off-policy temporal-difference control",
        },
        {
            "id": "sarsa",
            "name": "SARSA",
            "chapter": 1,
            "type": "tabular",
            "color": "#10b981",
            "envs": ["gridworld", "cliff"],
            "tagline": "On-policy temporal-difference control",
        },
        {
            "id": "dqn",
            "name": "DQN",
            "chapter": 2,
            "type": "deep_value",
            "color": "#3b82f6",
            "envs": ["gridworld", "cartpole"],
            "tagline": "Deep Q-Network with experience replay",
        },
        {
            "id": "dueling_dqn",
            "name": "Dueling DQN",
            "chapter": 2,
            "type": "deep_value",
            "color": "#8b5cf6",
            "envs": ["gridworld", "cartpole"],
            "tagline": "Value + Advantage decomposition",
        },
        {
            "id": "a2c",
            "name": "A2C",
            "chapter": 3,
            "type": "policy_gradient",
            "color": "#f43f5e",
            "envs": ["gridworld", "nav2d"],
            "tagline": "Advantage Actor-Critic",
        },
        {
            "id": "ppo",
            "name": "PPO",
            "chapter": 3,
            "type": "policy_gradient",
            "color": "#06b6d4",
            "envs": ["gridworld", "nav2d"],
            "tagline": "Proximal Policy Optimization",
        },
    ]
