# LaTeX-Specific Humanization Rules

Guidelines for preserving LaTeX structure while humanizing content.

## Table of Contents

1. [LaTeX Preservation Rules](#latex-preservation-rules)
2. [Environment-Specific Handling](#environment-specific-handling)
3. [Math Mode Preservation](#math-mode-preservation)
4. [Citation Command Handling](#citation-command-handling)
5. [Cross-Reference Preservation](#cross-reference-preservation)
6. [Special Character Handling](#special-character-handling)
7. [Humanization Targets by LaTeX Element](#humanization-targets-by-latex-element)
8. [Common Pitfalls](#common-pitfalls)

---

## LaTeX Preservation Rules

### Golden Rule
**NEVER modify any LaTeX command or environment structure. Only modify the plain text content within environments.**

### What NEVER to Touch
- All `\` commands (`\section`, `\cite`, `\ref`, `\label`, `\textbf`, etc.)
- Environment delimiters (`\begin{}`, `\end{}`)
- Math mode content (`$...$`, `\[...\]`, `equation`, `align`, etc.)
- Preamble content (before `\begin{document}`)
- Bibliography commands (`\bibliography`, `\bibliographystyle`)
- Table structure (`\begin{tabular}`, `\hline`, `&`, `\\`)
- Figure inclusion (`\includegraphics`, `\begin{tikzpicture}`)
- Custom macros (`\newcommand`, `\def` definitions)

### What CAN be Modified
- Plain text within body paragraphs
- Text within `\caption{}` commands
- Text within `\footnote{}` commands
- Content within `\title{}`, `\author{}`, `\thanks{}`
- Abstract text within `abstract` environment
- Text within `\item` entries (but not `\item` itself)
- Content in `\paragraph{}` and `\subparagraph{}`
- Text in theorem-like environments (but not the environment itself)

## Environment-Specific Handling

### Body Text Environments
```latex
% CAN MODIFY: text content only
\section{Introduction}  % PRESERVE EXACTLY
This is the text that can be modified.  % MODIFY THIS

\subsection{Background}  % PRESERVE EXACTLY
More text to modify here.  % MODIFY THIS
```

### Abstract Environment
```latex
\begin{abstract}  % PRESERVE
This text can be modified but keep it dense and informative.  % MODIFY
\end{abstract}  % PRESERVE
```

### Math Environments (PRESERVE COMPLETELY)
```latex
% PRESERVE ALL OF THE FOLLOWING EXACTLY:
$E = mc^2$

\[\int_0^\infty f(x) \, dx\]

\begin{equation}\label{eq:main}
  \hat{y} = \sigma(W x + b)
\end{equation}

\begin{align}
  a &= b + c \\
  d &= e + f
\end{align}

\begin{equation*}
  \mathcal{L}(\theta) = -\sum_{i=1}^n \log p(y_i | x_i; \theta)
\end{equation*}
```

**Rule**: If it's inside `$...$`, `\[...\]`, or a math environment, do not modify a single character.

### Figure Environments
```latex
\begin{figure}[t]  % PRESERVE
  \centering  % PRESERVE
  \includegraphics[width=0.8\textwidth]{figure1.png}  % PRESERVE
  \caption{This caption text can be modified.}  % MODIFY TEXT ONLY
  \label{fig:architecture}  % PRESERVE
\end{figure}  % PRESERVE
```

### Table Environments
```latex
\begin{table}[t]  % PRESERVE
  \centering  % PRESERVE
  \caption{Table caption text can be modified.}  % MODIFY TEXT ONLY
  \label{tab:results}  % PRESERVE
  \begin{tabular}{lcc}  % PRESERVE
    \toprule  % PRESERVE
    Method & Accuracy & F1 \\  % PRESERVE (can modify header text)
    \midrule  % PRESERVE
    Baseline & 0.85 & 0.83 \\  % PRESERVE (data)
    Ours & 0.92 & 0.91 \\  % PRESERVE (data)
    \bottomrule  % PRESERVE
  \end{tabular}  % PRESERVE
\end{table}  % PRESERVE
```

### List Environments
```latex
\begin{itemize}  % PRESERVE
  \item This item text can be modified.  % MODIFY TEXT ONLY
  \item Another item here.  % MODIFY TEXT ONLY
\end{itemize}  % PRESERVE

\begin{enumerate}  % PRESERVE
  \item First step text can be modified.  % MODIFY TEXT ONLY
  \item Second step text can be modified.  % MODIFY TEXT ONLY
\end{enumerate}  % PRESERVE
```

### Theorem-like Environments
```latex
\begin{theorem}  % PRESERVE
  This theorem statement text can be modified if needed.  % MODIFY WITH CAUTION
\end{theorem}  % PRESERVE

\begin{proof}  % PRESERVE
  Proof text can be modified.  % MODIFY
\end{proof}  % PRESERVE
```

**Caution**: Only modify theorem text if it's clearly explanatory prose, not formal mathematical statements.

### Algorithm Environments
```latex
\begin{algorithm}  % PRESERVE
  \caption{Algorithm caption can be modified.}  % MODIFY TEXT ONLY
  \label{alg:training}  % PRESERVE
  \begin{algorithmic}[1]  % PRESERVE
    \REQUIRE Input data $X$  % PRESERVE (math) + MODIFY (text)
    \ENSURE Model parameters $\theta$  % PRESERVE (math) + MODIFY (text)
    \FOR{$i = 1$ to $N$}  % PRESERVE
      \STATE Compute loss $\mathcal{L}_i$  % PRESERVE (math) + MODIFY (text)
    \ENDFOR  % PRESERVE
  \end{algorithmic}  % PRESERVE
\end{algorithm}  % PRESERVE
```

## Math Mode Preservation

### Inline Math `$...$`
```latex
The function $f(x)$ is continuous.  % PRESERVE $f(x)$, modify surrounding text
```

### Display Math `\[...\]`
```latex
\[
  \sum_{i=1}^{n} x_i = 0
\]  % PRESERVE ENTIRELY
```

### Equation Environment
```latex
\begin{equation}\label{eq:gradient}
  \nabla f(x) = \left[\frac{\partial f}{\partial x_1}, \ldots, \frac{\partial f}{\partial x_n}\right]^\top
\end{equation}  % PRESERVE ENTIRELY (including label)
```

### Math in Running Text
When math appears in the middle of a sentence:
```latex
% PRESERVE the $...$ parts, modify only the surrounding prose
We define the loss function $\mathcal{L}(\theta)$ to measure the discrepancy between predicted values $\hat{y}_i$ and true labels $y_i$.
```

## Citation Command Handling

### Citation Commands to Preserve
```latex
\cite{key1}  % PRESERVE
\citep{key1,key2}  % PRESERVE
\citet{key1}  % PRESERVE
\citeauthor{key1}  % PRESERVE
\citeyear{key1}  % PRESERVE
\nocite{key1}  % PRESERVE
```

### Citation in Running Text
```latex
% PRESERVE the \cite command, modify surrounding text
Recent work \citep{smith2023,jones2024} has explored this direction.
% Can modify to: "Smith and Jones \citep{smith2023,jones2024} recently explored this direction."
```

### Narrative Citations
```latex
% If text includes author names, can modify the narrative but keep \cite
As shown by \citet{smith2023}, the method achieves...
% Can modify to: "\citet{smith2023} demonstrated that the method achieves..."
```

## Cross-Reference Preservation

### All Cross-References Must Be Preserved
```latex
\label{sec:intro}  % PRESERVE
\ref{sec:intro}  % PRESERVE
\eqref{eq:main}  % PRESERVE
\cref{fig:results}  % PRESERVE (if using cleveref)
\pageref{tab:data}  % PRESERVE
```

### Cross-Reference in Text
```latex
% PRESERVE the \ref, modify surrounding text
As shown in Figure~\ref{fig:results}, our method outperforms the baseline.
% Can modify to: "Figure~\ref{fig:results} shows that our method outperforms the baseline."
```

## Special Character Handling

### LaTeX Escapes (Preserve)
```latex
\%  % percent sign
\$  % dollar sign
\&  % ampersand
\#  % hash
\_  % underscore
\{  \}  % braces
\textbackslash  % backslash in text
\textasciitilde  % tilde
\textasciicircum  % circumflex
```

### Accented Characters (Preserve)
```latex
\'e  % é
\"o  % ö
\~n  % ñ
\c{c}  % ç
\v{s}  % š
\u{a}  % ă
```

### Special Typography (Preserve)
```latex
\emph{italic text}  % PRESERVE command, can modify text content
\textbf{bold text}  % PRESERVE command, can modify text content
\texttt{monospace}  % PRESERVE command, can modify text content
\textsc{Small Caps}  % PRESERVE command, can modify text content
```

## Humanization Targets by LaTeX Element

### High-Priority Humanization Targets
1. **Abstract text**: Dense, formal, high detection risk. Apply full cognitive remodel.
2. **Introduction paragraphs**: Literature review prose. Apply voice calibration + structural camouflage.
3. **Discussion paragraphs**: Interpretive prose. Apply struggle simulation + hedge calibration.
4. **Conclusion paragraphs**: Synthesis text. Apply voice calibration.

### Medium-Priority Humanization Targets
5. **Figure captions**: Can inject voice and slight informality.
6. **Footnote text**: Good place for authorial voice.
7. **Algorithm comments**: Can be more conversational.

### Low-Priority Humanization Targets
8. **Methods prose**: Keep precise and direct. Minimal humanization (Profile A).
9. **Results prose**: Keep factual. Hedge calibration only.
10. **Table notes**: Keep concise. Minimal humanization.

### No Humanization (Preserve Only)
11. **Math environments**: All math content.
12. **Preamble**: Document setup.
13. **Bibliography entries**: BibTeX format (but verify authenticity in Stage 7).
14. **Table data**: Numbers and results.
15. **Algorithm pseudocode**: Code structure.

## Common Pitfalls

### Pitfall 1: Breaking Citation Keys
```latex
% WRONG: Modifying citation keys
\cite{smith2023_large} → \cite{Smith 2023 Large Scale}

% CORRECT: Keep keys exactly as they appear in .bib file
\cite{smith2023_large}  % PRESERVE
```

### Pitfall 2: Modifying Labels
```latex
% WRONG: Changing labels
\label{sec:intro} → \label{introduction_section}

% CORRECT: Keep labels exactly (or all refs break)
\label{sec:intro}  % PRESERVE
```

### Pitfall 3: Escaping Special Characters Incorrectly
```latex
% WRONG: Removing backslashes
50\% → 50%

% CORRECT: Keep LaTeX escapes
50\%  % PRESERVE (removing \ breaks LaTeX)
```

### Pitfall 4: Modifying Math Delimiters
```latex
% WRONG: Changing math mode
$f(x)$ → f(x)

% CORRECT: Preserve math mode exactly
$f(x)$  % PRESERVE
```

### Pitfall 5: Breaking Environment Structure
```latex
% WRONG: Removing environment commands
\begin{itemize}
\item First
\end{itemize}
→ First

% CORRECT: Preserve all environment commands
\begin{itemize}
\item First
\end{itemize}  % PRESERVE ALL
```

### Pitfall 6: Humanizing Inside Verbatim
```latex
% WRONG: Modifying verbatim content
\begin{verbatim}
import torch  →  We import the torch library
\end{verbatim}

% CORRECT: Preserve verbatim exactly
\begin{verbatim}
import torch
\end{verbatim}  % PRESERVE EXACTLY
```

### Pitfall 7: Breaking Custom Macros
```latex
% WRONG: Expanding custom macros
\methodname → Our Proposed Method

% CORRECT: Keep custom macros as-is
\methodname  % PRESERVE (defined in preamble)
```

### Pitfall 8: Modifying Optional Arguments
```latex
% WRONG: Changing optional args
\section[Short Title]{Long Title} → \section{Modified Long Title}

% CORRECT: Preserve optional arguments
\section[Short Title]{Long Title}  % PRESERVE BOTH
```

### Pitfall 9: Humanizing URLs
```latex
% WRONG: Modifying URLs
\url{https://github.com/user/repo} → \url{our code repository}

% CORRECT: Preserve URLs exactly
\url{https://github.com/user/repo}  % PRESERVE
```

### Pitfall 10: Breaking Multi-line Math
```latex
% WRONG: Modifying alignment in math
\begin{align}
  a &= b + c \\
  d &= e + f
\end{align}
→ \begin{align}
  a = b + c \\
  d = e + f
\end{align}

% CORRECT: Preserve alignment characters
\begin{align}
  a &= b + c \\
  d &= e + f
\end{align}  % PRESERVE (alignment & and newline \\
```

## Safe Humanization Examples

### Example 1: Body Paragraph
```latex
% BEFORE (AI-generated)
\section{Introduction}
It is important to note that large language models have revolutionized natural language processing. Furthermore, these models demonstrate remarkable capabilities across a wide range of tasks. However, it is crucial to underscore the challenges associated with their deployment in real-world scenarios.

% AFTER (humanized)
\section{Introduction}
Large language models have changed the field of natural language processing in ways that seemed impossible just five years ago. Their performance across tasks—from translation to code generation—has surprised even their creators. Yet deploying these systems in production environments introduces challenges that benchmark scores do not capture: latency constraints, cost scaling, and the gap between controlled evaluation and messy real-world inputs.
```

### Example 2: Abstract
```latex
% BEFORE (AI-generated)
\begin{abstract}
This paper presents a novel method for improving the efficiency of transformer architectures. The proposed approach leverages attention pruning to reduce computational complexity while maintaining performance. Experimental results demonstrate significant improvements across multiple benchmarks.
\end{abstract}

% AFTER (humanized)
\begin{abstract}
Transformer models are effective but expensive. We introduce attention pruning as a training-time technique that identifies and removes redundant attention heads without the accuracy drop typical of post-hoc compression. On six NLP benchmarks, our method reduces FLOPs by 40\% while degrading F1 by less than 0.3 points. Code and trained models are available at \url{https://github.com/example/repo}.
\end{abstract}
```

### Example 3: Figure Caption
```latex
% BEFORE (AI-generated)
\caption{Comparison of our proposed method with baseline approaches across different datasets.}

% AFTER (humanized)
\caption{Our method (solid line) consistently outperforms the strongest baseline (dashed) across dataset sizes. The gap widens notably below 10k training examples—precisely where labeled data is scarce and expensive to acquire.}
```
