"""LaTeX document reconstructor.

Rebuilds the complete .tex document by splicing the rewritten text blocks
back into the original source string using their character-level spans.
This guarantees zero disruption to untouched preamble, math, and layout.
"""

from __future__ import annotations

from q1_engine.models import ParsedDocument, Section
from q1_engine.utils.logging_setup import get_logger

log = get_logger("reconstructor")


class Reconstructor:
    """Rebuilds a LaTeX document from its modified sections."""

    def reconstruct(self, original_doc: ParsedDocument, sections: list[Section]) -> str:
        """Splicing rewritten blocks back into the original source.
        
        Processes blocks from back to front to avoid invalidating span offsets.
        
        Parameters
        ----------
        original_doc
            The parsed document containing the original source string.
        sections
            The sections containing potentially rewritten blocks.
            
        Returns
        -------
        str
            The complete, reconstructed LaTeX string.
        """
        source = original_doc.original_source
        
        # Flatten all blocks that have been rewritten
        rewrites: list[tuple[int, int, str]] = []
        for section in sections:
            for block in section.blocks:
                if block.rewritten_text is not None and block.rewritten_text != block.raw_latex:
                    rewrites.append((
                        block.span.start,
                        block.span.end,
                        block.rewritten_text,
                    ))
                    
        if not rewrites:
            log.info("No blocks were rewritten. Returning original document.")
            return source
            
        log.info("Reconstructing document with %d modified blocks", len(rewrites))
        
        # Sort rewrites by start position, descending (back to front)
        rewrites.sort(key=lambda x: x[0], reverse=True)
        
        # Splice strings
        result = source
        for start, end, new_text in rewrites:
            # Sanity check offsets
            if start < 0 or end > len(result) or start > end:
                log.error("Invalid span during reconstruction: [%d, %d]", start, end)
                continue
                
            result = result[:start] + new_text + result[end:]
            
        return result
