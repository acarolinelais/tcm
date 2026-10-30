// SessionStart: deixa a ponytail ativa (nível full) e lembra a humanizer para prosa em toda sessão.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const skills = join(dirname(fileURLToPath(import.meta.url)), "..", "skills");
const ponytail = readFileSync(join(skills, "ponytail", "SKILL.md"), "utf8").replace(/^---[\s\S]*?---\s*/, "");

const contexto = `Padrão deste projeto: a skill ponytail está ativa no nível full desde o início da sessão.
Ela vale para todo código e convive com os ADRs, o CLAUDE.md e as skills do projeto: em conflito, os ADRs vencem.
Para prosa (specs, ADRs, PRs, commits, comentários e textos de interface), aplique a skill humanizer no modo embutido.
Respostas no chat continuam em PT-BR.

${ponytail}`;

process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: contexto } }));
