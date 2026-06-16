from setuptools import setup, find_packages

setup(
    name="meritmap-translation-humaniser",
    version="1.5.2",
    description="Production-ready AI text humanisation pipeline (multi-engine translation chain)",
    long_description=open("README.md", encoding="utf-8").read(),
    long_description_content_type="text/markdown",
    author="Meritmap",
    author_email="contact@meritmap.io",
    url="https://meritmap.io",
    packages=find_packages(),
    python_requires=">=3.10",
    install_requires=[
        "httpx>=0.25.0",
        "toml>=0.10.2",
        "click>=8.1.0",
        "rich>=13.7.0",
        "deep-translator>=1.11.0",
    ],
    extras_require={
        "legacy": [
            "transformers>=4.36.0",
            "torch>=2.1.0",
            "nltk>=3.8.0",
            "langdetect>=1.0.9",
        ],
    },
    entry_points={
        "console_scripts": [
            "meritmap-humanise=src.standard.pipeline:main",
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Intended Audience :: Science/Research",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Text Processing :: Linguistic",
    ],
    keywords="ai humanise text rewriting nlp detection paraphrase academic latex",
    license="MIT",
)
