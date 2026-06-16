"""CLI entry point for the Q1 Engine -- 8-stage humanization pipeline."""

import argparse
import asyncio
import sys
from pathlib import Path

from q1_engine.models import PaperType, VoiceProfile
from q1_engine.pipeline.orchestrator import Q1Pipeline
from q1_engine.utils.logging_setup import setup_logging


def main():
    parser = argparse.ArgumentParser(
        description="Q1 Manuscript Refinement Engine -- 8-stage LaTeX humanization pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("input", type=str, help="Input .tex file")
    parser.add_argument("-o", "--output", type=str, help="Output .tex file (default: input_humanised.tex)")
    parser.add_argument("-c", "--config", type=str, help="Path to config.yaml (optional)")
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable debug logging")

    parser.add_argument(
        "--mode",
        type=str,
        choices=["8stage", "antigravity", "ultra-ninja"],
        default="8stage",
        help="Pipeline execution mode (default: 8stage)",
    )

    parser.add_argument(
        "--voice-profile",
        type=str,
        choices=[v.value for v in VoiceProfile],
        default=None,
        help="Voice profile for Stage 4 (default: auto-detected from domain)",
    )
    parser.add_argument(
        "--paper-type",
        type=str,
        choices=[p.value for p in PaperType],
        default="empirical",
        help="Paper type for Stage 3 configuration (default: empirical)",
    )
    parser.add_argument(
        "--domain",
        type=str,
        help="Force domain (e.g. computer_science, medicine). Skips auto-detection.",
    )
    parser.add_argument(
        "--target-score",
        type=float,
        default=80.0,
        help="Target human score for iterative refinement (default: 80.0)",
    )
    parser.add_argument(
        "--skip-citations",
        action="store_true",
        help="Skip Stage 7 citation authentication (faster processing)",
    )
    parser.add_argument(
        "--stages",
        type=str,
        default="1-8",
        help="Stages to run, e.g. '1-5' for partial runs (default: 1-8)",
    )
    parser.add_argument(
        "--report-json",
        type=str,
        default=None,
        help="Path to dump Stage 8 quality report JSON",
    )

    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file '{input_path}' not found.")
        sys.exit(1)

    output_path = (
        Path(args.output) if args.output
        else input_path.parent / f"{input_path.stem}_humanised.tex"
    )

    log_level = "DEBUG" if args.verbose else "INFO"
    setup_logging(log_level)

    print("Initializing Q1 Engine (8-stage pipeline)...")
    pipeline = Q1Pipeline(args.config)

    # Apply CLI overrides to pipeline config
    if args.voice_profile:
        pipeline.config.voice_profile = VoiceProfile(args.voice_profile)
    if args.paper_type:
        pipeline.config.paper_type = PaperType(args.paper_type)
    if args.target_score:
        pipeline.config.target_score = args.target_score
    if args.skip_citations:
        pipeline.config.skip_citations = True
    if args.stages:
        pipeline.config.stages = args.stages

    print(f"Processing: {input_path} -> {output_path}")
    print(f"Stages: {pipeline.config.stages}  |  Voice: {pipeline.config.voice_profile.value}  |  Target: {pipeline.config.target_score}")

    try:
        report = asyncio.run(pipeline.run(input_path, output_path, args.report_json, mode=args.mode))

        print("\n=== 8-Stage Humanisation Complete ===")
        print(f"Domain: {report.domain.domain.value} ({report.domain.confidence:.2f})")

        if report.humanisation:
            h = report.humanisation
            print("\nHumanisation Results:")
            print(f"   AI Patterns:   {h.ai_patterns_before} -> {h.ai_patterns_after} ({h.ai_patterns_removed_pct:.0f}% removed)")
            print(f"   Human Score:   {h.before.human_score:.1f} -> {h.after.human_score:.1f}/100  (Grade: {h.after.grade})")
            def get_dim_score(res, name):
                for d in res.dimensions:
                    if d.name.lower() == name.lower():
                        return d.score
                return 0.0

            print(f"   Burstiness:    {get_dim_score(h.after, 'burstiness'):.1f}/100")
            print(f"   Vocabulary:    {get_dim_score(h.after, 'vocabulary_entropy'):.1f}/100")
            print(f"   Q1 Readiness:  {h.q1_writing_readiness:.1f}%  ({h.humanisation_grade})")

            if h.remaining_suggestions:
                print("\nRecommendations:")
                for s in h.remaining_suggestions[:5]:
                    print(f"   - {s}")

        compliant = report.journal_compliance and report.journal_compliance.is_compliant
        print(f"\nJournal Compliance: {'PASS' if compliant else 'FAIL'}")
        if args.report_json:
            print(f"Quality Report:     {args.report_json}")

    except KeyboardInterrupt:
        print("\nInterrupted by user.")
        sys.exit(130)
    except Exception as e:
        print(f"\nPipeline failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
