"""Setup script to download required local LLMs and NLP models."""

import os
import sys
import subprocess

def run_command(cmd: list[str]) -> bool:
    print(f"Running: {' '.join(cmd)}")
    try:
        subprocess.run(cmd, check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Command failed with exit code {e.returncode}")
        return False
    except FileNotFoundError:
        print(f"Error: Command '{cmd[0]}' not found. Is it installed?")
        return False

def main():
    print("=== Q1 Engine Model Setup ===")
    
    print("\n1. Pulling Ollama Models (this may take a while depending on bandwidth)...")
    # Pull the main and fallback models
    models = ["qwen3:32b", "qwen3:14b"]
    for model in models:
        print(f"Pulling {model}...")
        success = run_command(["ollama", "pull", model])
        if not success:
            print(f"Warning: Failed to pull {model}. You may need to start the Ollama server first.")
            print("Try running 'ollama serve' in a separate terminal.")
            
    print("\n2. Downloading NLP Models (SBERT & BERTScore)...")
    print("This will download the models to your HuggingFace cache.")
    
    # Simple Python script to trigger HF model downloads
    download_script = """
import os
os.environ["TOKENIZERS_PARALLELISM"] = "false"

print("Downloading SBERT (all-MiniLM-L6-v2)...")
try:
    from sentence_transformers import SentenceTransformer
    SentenceTransformer('all-MiniLM-L6-v2')
    print("SBERT downloaded successfully.")
except ImportError:
    print("sentence_transformers not installed. Skipping.")

print("Downloading BERTScore (microsoft/deberta-xlarge-mnli)...")
try:
    from transformers import AutoModel, AutoTokenizer
    AutoTokenizer.from_pretrained('microsoft/deberta-xlarge-mnli')
    AutoModel.from_pretrained('microsoft/deberta-xlarge-mnli')
    print("BERTScore downloaded successfully.")
except ImportError:
    print("transformers not installed. Skipping.")
"""
    
    try:
        subprocess.run([sys.executable, "-c", download_script], check=True)
    except subprocess.CalledProcessError:
        print("Failed to download NLP models.")
        
    print("\n=== Setup Complete ===")

if __name__ == "__main__":
    main()
