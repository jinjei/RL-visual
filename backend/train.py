"""
Training script — run once to produce pre-trained weights + training curves.
Usage:
    python train.py          # train all algorithms
    python train.py --algo q_learning
"""

import argparse
import json
import numpy as np
from pathlib import Path
from tqdm import tqdm

ROOT = Path(__file__).parent
WEIGHTS = ROOT / "weights"
DATA = ROOT / "training_data"
WEIGHTS.mkdir(exist_ok=True)
DATA.mkdir(exist_ok=True)

# ------------------------------------------------------------------ #
#  Smoothing helper for training curves                               #
# ------------------------------------------------------------------ #

def smooth(rewards, k=50):
    if len(rewards) < k:
        return rewards
    return [float(np.mean(rewards[max(0, i - k): i + 1])) for i in range(len(rewards))]


def save_curves(name: str, rewards: list):
    path = DATA / f"{name}_rewards.json"
    path.write_text(json.dumps({"rewards": rewards, "smoothed": smooth(rewards)}))
    print(f"  Saved training curve → {path.name}")


# ------------------------------------------------------------------ #
#  Individual trainers                                                 #
# ------------------------------------------------------------------ #

def train_q_learning():
    print("\n[1/6] Q-Learning on GridWorld + CliffWalking")
    from envs import make_gridworld, make_cliff_walking
    from agents import QLearningAgent

    # GridWorld
    env = make_gridworld()
    agent = QLearningAgent(env.n_states, env.n_actions, epsilon_decay_episodes=3000)
    print("  Training on GridWorld …")
    result = agent.train(env, n_episodes=5000, snapshot_every=250)
    agent.save(WEIGHTS / "q_learning_gridworld.npy")
    save_curves("q_learning_gridworld", result["rewards"])
    (DATA / "q_learning_gridworld_snapshots.json").write_text(
        json.dumps(result["snapshots"])
    )

    # CliffWalking
    env_cliff = make_cliff_walking()
    agent_cliff = QLearningAgent(
        env_cliff.n_states, env_cliff.n_actions, epsilon_decay_episodes=3000
    )
    print("  Training on CliffWalking …")
    result_cliff = agent_cliff.train(env_cliff, n_episodes=5000, snapshot_every=250)
    agent_cliff.save(WEIGHTS / "q_learning_cliff.npy")
    save_curves("q_learning_cliff", result_cliff["rewards"])
    (DATA / "q_learning_cliff_snapshots.json").write_text(
        json.dumps(result_cliff["snapshots"])
    )
    print("  Done.")


def train_sarsa():
    print("\n[2/6] SARSA on GridWorld + CliffWalking")
    from envs import make_gridworld, make_cliff_walking
    from agents import SARSAAgent

    env = make_gridworld()
    agent = SARSAAgent(env.n_states, env.n_actions, epsilon=0.1)
    print("  Training on GridWorld …")
    result = agent.train(env, n_episodes=5000, snapshot_every=250)
    agent.save(WEIGHTS / "sarsa_gridworld.npy")
    save_curves("sarsa_gridworld", result["rewards"])

    env_cliff = make_cliff_walking()
    agent_cliff = SARSAAgent(env_cliff.n_states, env_cliff.n_actions, epsilon=0.05)
    print("  Training on CliffWalking …")
    result_cliff = agent_cliff.train(env_cliff, n_episodes=5000, snapshot_every=250)
    agent_cliff.save(WEIGHTS / "sarsa_cliff.npy")
    save_curves("sarsa_cliff", result_cliff["rewards"])
    (DATA / "sarsa_cliff_snapshots.json").write_text(
        json.dumps(result_cliff["snapshots"])
    )
    print("  Done.")


def train_dqn():
    print("\n[3/6] DQN on GridWorld + CartPole")
    from envs import make_gridworld, CartPoleEnv
    from agents import DQNAgent

    # GridWorld
    env = make_gridworld()
    agent = DQNAgent(obs_dim=2, n_actions=4, epsilon_decay=30_000, target_update=500)
    print("  Training on GridWorld …")
    result = agent.train(env, n_episodes=2000)
    agent.save(WEIGHTS / "dqn_gridworld.pt")
    save_curves("dqn_gridworld", result["rewards"])

    # CartPole
    env_cp = CartPoleEnv()
    agent_cp = DQNAgent(
        obs_dim=4, n_actions=2,
        lr=1e-3,
        epsilon_decay=10_000,   # decay over ~10k steps so the agent actually
                                # starts exploiting early (was 50k → ε stuck ~0.6)
        target_update=500,
        buffer_size=50_000, batch_size=64,
    )
    print("  Training on CartPole (this takes ~3-5 min) …")
    # eval_every keeps the best greedy checkpoint — DQN on CartPole peaks then
    # catastrophically forgets, so the final weights are usually not the best.
    result_cp = agent_cp.train(env_cp, n_episodes=800, eval_every=20)
    agent_cp.save(WEIGHTS / "dqn_cartpole.pt")
    save_curves("dqn_cartpole", result_cp["rewards"])
    print("  Done.")


def train_dueling_dqn():
    print("\n[4/6] Dueling DQN on GridWorld + CartPole")
    from envs import make_gridworld, CartPoleEnv
    from agents import DuelingDQNAgent

    env = make_gridworld()
    agent = DuelingDQNAgent(obs_dim=2, n_actions=4, epsilon_decay=30_000, target_update=500)
    print("  Training on GridWorld …")
    result = agent.train(env, n_episodes=2000)
    agent.save(WEIGHTS / "dueling_dqn_gridworld.pt")
    save_curves("dueling_dqn_gridworld", result["rewards"])

    env_cp = CartPoleEnv()
    agent_cp = DuelingDQNAgent(
        obs_dim=4, n_actions=2,
        lr=1e-3, epsilon_decay=10_000, target_update=500,
        buffer_size=50_000, batch_size=64,
    )
    print("  Training on CartPole (this takes ~3-5 min) …")
    result_cp = agent_cp.train(env_cp, n_episodes=800, eval_every=20)
    agent_cp.save(WEIGHTS / "dueling_dqn_cartpole.pt")
    save_curves("dueling_dqn_cartpole", result_cp["rewards"])
    print("  Done.")


def train_a2c():
    print("\n[5/6] A2C on GridWorld + Nav2D")
    from envs import make_gridworld, Nav2DEnv
    from agents import A2CAgent

    env = make_gridworld()
    agent = A2CAgent(obs_dim=2, n_actions=4, continuous=False, n_steps=20)
    print("  Training on GridWorld …")
    result = agent.train(env, total_steps=200_000)
    agent.save(WEIGHTS / "a2c_gridworld.pt")
    save_curves("a2c_gridworld", result["rewards"])

    env_nav = Nav2DEnv()
    agent_nav = A2CAgent(obs_dim=6, n_actions=2, continuous=True, lr=1e-3, n_steps=32)
    print("  Training on Nav2D (this takes ~3-5 min) …")
    result_nav = agent_nav.train(env_nav, total_steps=500_000)
    agent_nav.save(WEIGHTS / "a2c_nav2d.pt")
    save_curves("a2c_nav2d", result_nav["rewards"])
    print("  Done.")


def train_ppo():
    print("\n[6/6] PPO on GridWorld + Nav2D")
    from envs import make_gridworld, Nav2DEnv
    from agents import PPOAgent

    env = make_gridworld()
    agent = PPOAgent(
        obs_dim=2, n_actions=4, continuous=False,
        lr=3e-4,
        horizon=256,        # shorter than an episode → updates within episodes
        n_epochs=4,         # fewer epochs → less overfit to each batch
        batch_size=64,
        entropy_coef=0.04,  # stronger exploration to avoid policy collapse
                            # (was 0.01 → policy collapsed to "always down")
    )
    print("  Training on GridWorld …")
    # eval_every keeps the best greedy checkpoint — PPO here oscillates, so the
    # final weights are often a collapsed policy.
    result = agent.train(env, total_steps=500_000, eval_every=5_000)
    agent.save(WEIGHTS / "ppo_gridworld.pt")
    save_curves("ppo_gridworld", result["rewards"])

    env_nav = Nav2DEnv()
    agent_nav = PPOAgent(
        obs_dim=6, n_actions=2, continuous=True,
        lr=1e-3,           # same as A2C — faster convergence on this task
        horizon=512,       # shorter than episode length → more updates per ep
        n_epochs=6,        # fewer epochs avoids overfit to each batch
        batch_size=64,
        entropy_coef=0.02, # slightly more exploration pressure
    )
    print("  Training on Nav2D (this takes ~5-8 min) …")
    result_nav = agent_nav.train(env_nav, total_steps=1_500_000)
    agent_nav.save(WEIGHTS / "ppo_nav2d.pt")
    save_curves("ppo_nav2d", result_nav["rewards"])
    print("  Done.")


# ------------------------------------------------------------------ #
#  Entry point                                                         #
# ------------------------------------------------------------------ #

TRAINERS = {
    "q_learning": train_q_learning,
    "sarsa": train_sarsa,
    "dqn": train_dqn,
    "dueling_dqn": train_dueling_dqn,
    "a2c": train_a2c,
    "ppo": train_ppo,
}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--algo", choices=list(TRAINERS.keys()), default=None)
    args = parser.parse_args()

    if args.algo:
        TRAINERS[args.algo]()
    else:
        print("Training all 6 algorithms. Total time: ~20-30 min on CPU / ~10 min on MPS.")
        for fn in TRAINERS.values():
            fn()

    print("\nAll done! Weights saved to ./weights/  |  Curves saved to ./training_data/")
