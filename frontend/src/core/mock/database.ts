import type { PerfilAtual } from "@/core/auth/api";
import type { TokenResponse } from "@/core/auth/session";
import type { Perfil, Permissao } from "@/modules/perfis/api/perfis.api";
import type { Setor, SetorGerente } from "@/modules/setores/api/setores.api";
import type { Time, TimeMembro } from "@/modules/times/api/times.api";
import type { Usuario, UsuarioFormValues } from "@/modules/usuarios/model/usuario";
import type { UsuarioFiltros } from "@/modules/usuarios/api/usuario.api";
import {
  opcoesStatusResponsavel,
  type AtualizarCasoTesteInput,
  type AtualizarProjetoInput,
  type CasoTeste,
  type CriarCasoTesteInput,
  type CriarProjetoInput,
  type FormFactorMatriz,
  type FormFactorExecucao,
  type FormFactorResultados,
  type FormFactorGlobal,
  type FormFactorExecucaoGlobal,
  type FormFactorResultadosGlobais,
  type FiltrosFormFactorGlobal,
  type FiltrosFormFactor,
  type CriarRodadaFormFactorInput,
  type EnviarResultadosRodadaInput,
  type RodadaFormFactor,
  type LinhaFormFactor,
  type Projeto,
  type StatusProjeto,
} from "@/modules/projetos/model/projeto";
import type { ModeloDispositivo } from "@/modules/modelos-dispositivo/model/modelo-dispositivo";
import { lerPlanilhaProjeto, PlanilhaProjetoError, type PessoasDaLinha, type PlanilhaProjeto } from "@/modules/projetos/utils/planilha-projeto";
import { ApiError, type ProblemDetailsError } from "@/shared/api/problem-details";
import type { PagedResult } from "@/shared/types/paged-result";

const STORAGE_KEY = "sdf.mock.database.v1";
const UNIT_ID = "mock-unit-manaus";
const ADMIN_ID = "mock-user-admin";
const MANAGER_ID = "mock-user-manager";
const TEAM_ID = "mock-team-platform";

/** Resultado importado do SDF, um por Test Case e modelo; o histórico é preservado. */
interface ResultadoFormFactorMock {
  execucao_id?: string;
  tc_id: string;
  caso_teste_id?: string;
  responsavel_id?: string;
  sdf_id: string | null;
  modelo_dispositivo_id: string;
  resultado: string;
  data_reportada: string;
  origem?: "SDF" | "MANUAL";
}

interface ExecucaoFormFactorMock {
  execucao_id: string;
  rodada_id: string;
  projeto_id: string;
  caso_teste_id: string;
  sdf_id: string | null;
  data_reportada: string;
  resultados_registrados: boolean;
}

interface Database {
  schemaVersion?: number;
  unidade: { id: string; nome: string; ativo: boolean };
  usuarios: Usuario[];
  perfis: Perfil[];
  permissoes: Permissao[];
  setores: Setor[];
  gerentesSetor: SetorGerente[];
  times: Time[];
  membrosTime: TimeMembro[];
  projetos: Projeto[];
  modelosDispositivo: ModeloDispositivo[];
  projetoModelos: { projeto_id: string; modelo_dispositivo_id: string; ativo?: boolean }[];
  casosTeste: CasoTeste[];
  formFactor: ResultadoFormFactorMock[];
  rodadasFormFactor: RodadaFormFactor[];
  execucoesFormFactor: ExecucaoFormFactorMock[];
  importacoesSdf: { importacao_id: string; projeto_id: string; importado_em: string }[];
  idiomaPorUsuario: Record<string, PerfilAtual["idioma_preferido"]>;
  senhasAlteradas: string[];
}

const permissoes: Permissao[] = [
  ["usuarios.consultar", "Consultar usuários", "usuarios", "Users", 1],
  ["usuarios.perfil.consultar", "Consultar perfil atribuído a usuários no escopo permitido", "usuarios", "Users", 1],
  ["usuarios.gerenciar", "Criar e alterar usuários", "usuarios", "Users", 1],
  ["setores.consultar", "Consultar setores", "setores", "Sectors", 2],
  ["setores.gerenciar", "Criar e alterar setores", "setores", "Sectors", 2],
  ["times.consultar", "Consultar times", "times", "Teams", 3],
  ["times.criar", "Criar times", "times", "Teams", 3],
  ["times.gerenciar", "Gerenciar membros dos times", "times", "Teams", 3],
  ["perfis.gerenciar", "Gerenciar perfis e permissões", "perfis", "Profiles", 4],
  ["projetos.consultar", "Consultar projetos", "projetos", "Projects", 5],
  ["projetos.gerenciar", "Criar e gerenciar projetos", "projetos", "Projects", 5],
  ["test_cases.consultar", "Consultar Test Cases do time", "test_cases", "Test Cases", 6],
  ["test_cases.gerenciar", "Gerenciar Test Cases do time", "test_cases", "Test Cases", 6],
  ["form_factor.consultar", "Consultar Resumo e histórico Form Factor dos projetos no escopo permitido, incluindo Resultados Gerais para Administrador, Gerente e KP", "form_factor", "Form Factor", 7],
  ["form_factor.importar", "Importar resultados SDF", "form_factor", "Form Factor", 7],
  ["form_factor.registrar", "Criar rodadas e lançar resultados Form Factor", "form_factor", "Form Factor", 7],
  ["modelos_dispositivo.gerenciar", "Cadastrar, editar, ativar e inativar modelos no catálogo da unidade", "modelos_dispositivo", "Device models", 8],
].map(([id, descricao, codigo, nome, ordem], index) => ({
  id: String(id), descricao: String(descricao), ordem: index + 1,
  modulo: { codigo: String(codigo), nome: String(nome), ordem: Number(ordem) },
}));

function createSeed(): Database {
  const allPermissions = permissoes.map((item) => item.id);
  const adminProfile: Perfil = { id: "mock-profile-admin", nome: "Administrador", descricao: "Acesso completo à unidade.", codigo: "ADMIN_UNIDADE", permissoes: allPermissions.filter((permission) => permission !== "modelos_dispositivo.gerenciar") };
  const standardProfile: Perfil = { id: "mock-profile-standard", nome: "Developer", descricao: "Consulta projetos, TCs e Form Factor do time e atualiza somente os TCs atribuídos.", codigo: "USUARIO_PADRAO", permissoes: ["projetos.consultar", "test_cases.consultar", "form_factor.consultar", "form_factor.registrar", "times.consultar", "usuarios.perfil.consultar"] };
  const managerProfile: Perfil = { id: "mock-profile-manager", nome: "Gerente", descricao: "Gerencia pessoas, rodadas e resultados nos times do escopo.", codigo: "GERENTE", permissoes: ["usuarios.consultar", "usuarios.perfil.consultar", "usuarios.gerenciar", "setores.consultar", "times.consultar", "times.criar", "times.gerenciar", "projetos.consultar", "projetos.gerenciar", "test_cases.consultar", "test_cases.gerenciar", "form_factor.consultar", "form_factor.importar", "form_factor.registrar"] };
  const kpProfile: Perfil = { id: "mock-profile-kp", nome: "KP", descricao: "Acompanha atividades, rodadas e resultados dos times associados.", codigo: "KP", permissoes: ["usuarios.consultar", "setores.consultar", "times.consultar", "times.gerenciar", "projetos.consultar", "projetos.gerenciar", "test_cases.consultar", "test_cases.gerenciar", "modelos_dispositivo.gerenciar", "form_factor.consultar", "form_factor.importar", "form_factor.registrar"] };
  const sectors: Setor[] = [
    { id: "mock-sector-engineering", unidade_id: UNIT_ID, nome: "Engenharia", ativo: true },
    { id: "mock-sector-operations", unidade_id: UNIT_ID, nome: "Operações", ativo: true },
    { id: "mock-sector-archive", unidade_id: UNIT_ID, nome: "Setor inativo", ativo: false },
  ];
  const users: Usuario[] = [
    { id: ADMIN_ID, nome: "Administradora", email: "admin@sdfmanager.com", ativo: true, perfil_id: adminProfile.id, created_at: "2026-01-10T12:00:00Z" },
    { id: MANAGER_ID, nome: "Ivan Moreira", email: "ivan.moreira@sidia.com", ativo: true, perfil_id: managerProfile.id, created_at: "2026-01-12T12:00:00Z" },
    { id: "mock-user-kp", nome: "Kaique Pereira", email: "kaique.pereira@example.com", ativo: true, perfil_id: kpProfile.id, responsavel_id: MANAGER_ID, created_at: "2026-01-15T12:00:00Z" },
    { id: "mock-user-dev", nome: "Daniel Oliveira", email: "daniel.oliveira@example.com", ativo: true, perfil_id: standardProfile.id, responsavel_id: MANAGER_ID, created_at: "2026-02-01T12:00:00Z" },
    { id: "mock-user-standard", nome: "Ana Souza", email: "ana.souza@example.com", ativo: true, perfil_id: standardProfile.id, responsavel_id: MANAGER_ID, created_at: "2026-02-05T12:00:00Z" },
    { id: "mock-user-inactive", nome: "Rafael Lima", email: "rafael.lima@example.com", ativo: false, perfil_id: standardProfile.id, responsavel_id: MANAGER_ID, created_at: "2026-02-10T12:00:00Z" },
  ].map((user: Usuario) => ({ ...user, user_id: user.user_id ?? null }));
  return {
    schemaVersion: 18,
    unidade: { id: UNIT_ID, nome: "Manaus", ativo: true },
    usuarios: users,
    perfis: [adminProfile, standardProfile, managerProfile, kpProfile],
    permissoes,
    setores: sectors,
    gerentesSetor: [{ setor_id: sectors[0].id, usuario_id: MANAGER_ID, ativo: true }],
    times: [
      { id: TEAM_ID, setor_id: sectors[0].id, nome: "Plataforma", gerente_id: MANAGER_ID, ativo: true },
      { id: "mock-team-operations", setor_id: sectors[1].id, nome: "Suporte interno", gerente_id: null, ativo: true },
      { id: "mock-team-inactive", setor_id: sectors[1].id, nome: "Time arquivado", gerente_id: null, ativo: false },
    ],
    membrosTime: [
      { id: "mock-member-dev", time_id: TEAM_ID, usuario_id: "mock-user-dev", usuario_nome: "Daniel Oliveira", usuario_perfil: "Developer", usuario_perfil_codigo: "USUARIO_PADRAO", ativo: true },
      { id: "mock-member-kp", time_id: TEAM_ID, usuario_id: "mock-user-kp", usuario_nome: "Kaique Pereira", usuario_perfil: "KP", usuario_perfil_codigo: "KP", ativo: true },
      { id: "mock-member-inactive", time_id: TEAM_ID, usuario_id: "mock-user-inactive", usuario_nome: "Rafael Lima", usuario_perfil: "Developer", usuario_perfil_codigo: "USUARIO_PADRAO", ativo: false },
    ],
    projetos: [],
    modelosDispositivo: [
      { id: "mock-model-s27-ultra", unidade_id: UNIT_ID, nome: "S27 Ultra", descricao: "Flagship 2027", ativo: true, created_at: "2026-03-01T12:00:00Z", updated_at: "2026-03-01T12:00:00Z" },
      { id: "mock-model-s26-ultra", unidade_id: UNIT_ID, nome: "S26 Ultra", descricao: null, ativo: true, created_at: "2026-03-01T12:00:00Z", updated_at: "2026-03-01T12:00:00Z" },
      { id: "mock-model-sep-lite", unidade_id: UNIT_ID, nome: "SEP Lite", descricao: null, ativo: true, created_at: "2026-03-01T12:00:00Z", updated_at: "2026-03-01T12:00:00Z" },
      { id: "mock-model-tab-s11", unidade_id: UNIT_ID, nome: "Tab S11", descricao: "Tablet", ativo: true, created_at: "2026-03-01T12:00:00Z", updated_at: "2026-03-01T12:00:00Z" },
    ],
    projetoModelos: [],
    casosTeste: [],
    formFactor: [],
    rodadasFormFactor: [],
    execucoesFormFactor: [],
    importacoesSdf: [],
    idiomaPorUsuario: {},
    senhasAlteradas: [],
  };
}

function readDb(): Database {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return writeDb(createSeed());
  try {
    const db = JSON.parse(stored) as Database;
    if ((db.schemaVersion ?? 1) < 6) {
      // Align existing demo data once without overriding later permission edits.
      db.perfis.filter((profile) => profile.codigo === "KP").forEach((profile) => {
        profile.permissoes = [...new Set([...profile.permissoes, "usuarios.consultar", "setores.consultar", "times.consultar", "times.gerenciar"])];
      });
      db.permissoes = permissoes;
      db.perfis.forEach((profile) => {
        if (profile.codigo === "ADMIN_UNIDADE") profile.permissoes = permissoes.map((item) => item.id);
        if (profile.codigo === "GERENTE" || profile.codigo === "KP") {
          profile.permissoes = [...new Set([...profile.permissoes, "projetos.consultar", "projetos.gerenciar", "test_cases.consultar", "test_cases.gerenciar"] )];
        }
      });
      db.projetos ??= [];
      db.modelosDispositivo ??= ["S27 Ultra", "S26 Ultra", "SEP Lite", "Tab S11"].map((nome) => ({
        id: `mock-model-${nome.toLowerCase().replace(/ /g, "-")}`, unidade_id: db.unidade.id, nome, descricao: null, ativo: true, created_at: null, updated_at: null,
      }));
      db.projetoModelos ??= [];
      db.casosTeste ??= [];
      db.formFactor ??= [];
      db.importacoesSdf ??= [];
      db.schemaVersion = 6;
      writeDb(db);
    }
    if ((db.schemaVersion ?? 1) < 7) {
      const developer = db.perfis.find((profile) => profile.codigo === "USUARIO_PADRAO");
      if (developer) {
        developer.nome = "Developer";
        developer.descricao = "Consulta projetos e TCs do time e atualiza somente os TCs atribuídos.";
        developer.permissoes = ["projetos.consultar", "test_cases.consultar"];
        const legacyDeveloper = db.perfis.find((profile) => profile.id === "mock-profile-developer");
        if (legacyDeveloper) {
          db.usuarios.filter((user) => user.perfil_id === legacyDeveloper.id).forEach((user) => { user.perfil_id = developer.id; });
          db.perfis = db.perfis.filter((profile) => profile.id !== legacyDeveloper.id);
        }
        db.membrosTime.filter((member) => member.usuario_perfil_codigo === "USUARIO_PADRAO").forEach((member) => { member.usuario_perfil = "Developer"; });
      }
      db.schemaVersion = 7;
      writeDb(db);
    }
    if ((db.schemaVersion ?? 1) < 8) {
      const developer = db.perfis.find((profile) => profile.codigo === "USUARIO_PADRAO");
      if (developer && !developer.permissoes.includes("form_factor.consultar")) {
        developer.permissoes = [...developer.permissoes, "form_factor.consultar"];
        if (developer.descricao === "Consulta projetos e TCs do time e atualiza somente os TCs atribuídos.") {
          developer.descricao = "Consulta projetos, TCs e Form Factor do time e atualiza somente os TCs atribuídos.";
        }
      }
      db.schemaVersion = 8;
      writeDb(db);
    }
    if ((db.schemaVersion ?? 1) < 9) {
      // O progresso que estava em `situation` passa para `status`; casos existentes recebem New.
      db.casosTeste.forEach((testCase) => {
        const legado = testCase as unknown as { situation: string; status?: string };
        legado.status ??= legado.situation;
        legado.situation = "New";
      });
      db.schemaVersion = 9;
      writeDb(db);
    }
    if ((db.schemaVersion ?? 1) < 10) {
      // Mesma seed da migration 93a4b5c6d7e8: o Developer consulta times e o perfil dos usuários no escopo.
      const developer = db.perfis.find((profile) => profile.codigo === "USUARIO_PADRAO");
      if (developer) developer.permissoes = [...new Set([...developer.permissoes, "times.consultar", "usuarios.perfil.consultar"])];
      db.schemaVersion = 10;
      writeDb(db);
    }
    if ((db.schemaVersion ?? 1) < 11) {
      db.usuarios.forEach((user) => { user.user_id ??= null; });
      db.schemaVersion = 11;
      writeDb(db);
    }
    if ((db.schemaVersion ?? 1) < 12) {
      // Mesma seed da migration a2b3c4d5e6f7: descrição nos modelos e gestão do catálogo pelo KP.
      db.permissoes = permissoes;
      db.perfis.filter((profile) => profile.codigo === "KP").forEach((profile) => {
        profile.permissoes = [...new Set([...profile.permissoes, "modelos_dispositivo.gerenciar"])];
      });
      db.modelosDispositivo.forEach((model) => {
        model.descricao ??= null;
        model.created_at ??= null;
        model.updated_at ??= model.created_at;
      });
      db.schemaVersion = 12;
      writeDb(db);
    }
    if ((db.schemaVersion ?? 1) < 13) {
      db.perfis.filter((profile) => profile.codigo === "GERENTE" || profile.codigo === "KP").forEach((profile) => {
        profile.permissoes = [...new Set([...profile.permissoes, "form_factor.consultar"])];
      });
      db.schemaVersion = 13;
      writeDb(db);
    }
    if ((db.schemaVersion ?? 1) < 14) {
      db.permissoes = permissoes;
      db.perfis.filter((profile) => profile.codigo === "ADMIN_UNIDADE").forEach((profile) => {
        profile.permissoes = profile.permissoes.filter((permission) => permission !== "modelos_dispositivo.gerenciar");
      });
      db.schemaVersion = 14;
      writeDb(db);
    }
    if ((db.schemaVersion ?? 1) < 15) {
      const gerente = db.usuarios.find((user) => user.id === MANAGER_ID);
      if (gerente?.email === "mariana.costa@example.com") {
        gerente.nome = "Ivan Moreira";
        gerente.email = "ivan.moreira@sidia.com";
      }
      db.usuarios
        .filter((user) => ["mock-user-kp", "mock-user-dev", "mock-user-standard", "mock-user-inactive"].includes(user.id))
        .forEach((user) => { user.responsavel_id = MANAGER_ID; });
      db.schemaVersion = 15;
      return writeDb(db);
    }
    if ((db.schemaVersion ?? 1) < 16) {
      db.projetos.forEach((project) => { project.nome ||= `${project.app} ${project.one_ui}`; });
      db.schemaVersion = 16;
      return writeDb(db);
    }
    if ((db.schemaVersion ?? 1) < 17) {
      db.permissoes = permissoes;
      db.rodadasFormFactor ??= [];
      db.execucoesFormFactor ??= [];
      db.casosTeste.forEach((testCase) => {
        if ((testCase.status as string) === "Pass") testCase.status = "Done";
        if ((testCase.status as string) === "Fail") testCase.status = "InReview";
      });
      db.perfis.forEach((profile) => {
        if (profile.codigo === "USUARIO_PADRAO") {
          profile.permissoes = [...new Set([...profile.permissoes, "form_factor.registrar"] )];
        }
        if (profile.codigo === "GERENTE" || profile.codigo === "KP") {
          profile.permissoes = [...new Set([...profile.permissoes, "form_factor.importar", "form_factor.registrar"] )];
        }
        if (profile.codigo === "ADMIN_UNIDADE") {
          profile.permissoes = [...new Set([...profile.permissoes, "form_factor.registrar"] )];
        }
      });
      db.schemaVersion = 17;
      return writeDb(db);
    }
    if ((db.schemaVersion ?? 1) < 18) {
      // Spec 023: TC em revisão cuja execução mais recente teve FAIL passa a In Fixes.
      db.casosTeste.forEach((testCase) => {
        if (testCase.status !== "InReview") return;
        const resultados = db.formFactor.filter((item) => item.caso_teste_id === testCase.id);
        const ultima = resultados.reduce<ResultadoFormFactorMock | undefined>((maisRecente, item) => !maisRecente || item.data_reportada > maisRecente.data_reportada ? item : maisRecente, undefined);
        if (ultima && resultados.some((item) => item.execucao_id === ultima.execucao_id && item.resultado.trim().toUpperCase() === "FAIL")) testCase.status = "InFixes";
      });
      db.schemaVersion = 18;
      return writeDb(db);
    }
    return db;
  }
  catch { return writeDb(createSeed()); }
}

function writeDb(db: Database): Database {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  return db;
}

function updateDb<T>(update: (db: Database) => T): T {
  const db = readDb();
  const result = update(db);
  writeDb(db);
  return result;
}

function id(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

function page<T>(items: T[], pageNumber: number, pageSize: number): PagedResult<T> {
  const start = (pageNumber - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: pageNumber, page_size: pageSize, total_count: items.length };
}

function profileFor(db: Database, user: Usuario) {
  return db.perfis.find((perfil) => perfil.id === user.perfil_id);
}

function buildCurrentUser(db: Database, user: Usuario): PerfilAtual {
  const profile = profileFor(db, user);
  const userTeams = db.membrosTime.filter((member) => member.usuario_id === user.id && member.ativo)
    .map((member) => db.times.find((team) => team.id === member.time_id && team.ativo))
    .filter((team): team is Time => Boolean(team));
  const managedSectors = db.gerentesSetor.filter((manager) => manager.usuario_id === user.id && manager.ativo).map((manager) => manager.setor_id);
  return {
    id: user.id, nome: user.nome, email: user.email, unidade_id: db.unidade.id, unidade_nome: db.unidade.nome,
    perfil_codigo: profile?.codigo ?? null, perfil: profile?.nome ?? null, permissoes: profile?.permissoes ?? [],
    times: userTeams.map(({ id: teamId, nome }) => ({ id: teamId, nome })), setores_gerenciados: managedSectors,
    time_atual_id: userTeams[0]?.id ?? null, tem_multiplos_times: userTeams.length > 1,
    senha_alteracao_obrigatoria: false, idioma_preferido: db.idiomaPorUsuario[user.id] ?? "en",
  };
}

export const mockAuth = {
  login(email: string, password: string): TokenResponse {
    void password;
    const db = readDb();
    const user = db.usuarios.find((item) => item.email.toLowerCase() === email.toLowerCase());
    if (!user || !user.ativo) throw new Error("Conta mock não encontrada ou inativa. Use admin@sdfmanager.com / admin@123.");
    return { access_token: `mock.${user.id}`, refresh_token: `mock-refresh.${user.id}`, expires_in: 3600, token_type: "bearer" };
  },
  currentUser(token: string | null): PerfilAtual {
    const userId = token?.startsWith("mock.") ? token.slice("mock.".length) : ADMIN_ID;
    const db = readDb();
    const user = db.usuarios.find((item) => item.id === userId && item.ativo);
    if (!user) throw new Error("Sessão mock inválida. Saia e entre novamente.");
    return buildCurrentUser(db, user);
  },
  updateLanguage(language: PerfilAtual["idioma_preferido"]) {
    const userId = currentMockUserId();
    updateDb((db) => { db.idiomaPorUsuario[userId] = language; });
    return { idioma_preferido: language };
  },
  changePassword(password: string): TokenResponse {
    const userId = currentMockUserId();
    updateDb((db) => { if (!db.senhasAlteradas.includes(userId)) db.senhasAlteradas.push(userId); });
    void password;
    return { access_token: `mock.${userId}`, refresh_token: `mock-refresh.${userId}`, expires_in: 3600, token_type: "bearer" };
  },
};

function currentMockUserId() {
  const token = sessionStorage.getItem("sdf.access");
  return token?.startsWith("mock.") ? token.slice("mock.".length) : ADMIN_ID;
}

export const mockUsuarioApi = {
  listar(pageNumber: number, pageSize: number, filters: UsuarioFiltros = {}) {
    const db = readDb();
    const currentUser = db.usuarios.find((user) => user.id === currentMockUserId());
    const profile = currentUser && profileFor(db, currentUser);
    const currentTeamIds = new Set(db.membrosTime
      .filter((member) => member.usuario_id === currentUser?.id && member.ativo)
      .map((member) => member.time_id));
    const managedSectorIds = new Set(db.gerentesSetor
      .filter((manager) => manager.usuario_id === currentUser?.id && manager.ativo)
      .map((manager) => manager.setor_id));
    db.times.filter((team) => managedSectorIds.has(team.setor_id)).forEach((team) => currentTeamIds.add(team.id));
    let users = profile?.codigo === "ADMIN_UNIDADE"
      ? [...db.usuarios]
      : db.usuarios.filter((user) => profileFor(db, user)?.codigo !== "ADMIN_UNIDADE" && (
        user.id === currentUser?.id ||
        (profile?.codigo === "GERENTE" && user.responsavel_id === currentUser?.id) ||
        db.membrosTime.some((member) => member.usuario_id === user.id && member.ativo && currentTeamIds.has(member.time_id))));
    if (filters.nome) users = users.filter((user) => user.nome.toLocaleLowerCase().includes(filters.nome!.toLocaleLowerCase()));
    if (filters.email) users = users.filter((user) => user.email.toLocaleLowerCase().includes(filters.email!.toLocaleLowerCase()));
    if (filters.ativo !== undefined) users = users.filter((user) => user.ativo === filters.ativo);
    if (filters.perfil_id) users = users.filter((user) => user.perfil_id === filters.perfil_id);
    if (filters.responsavel_id) users = users.filter((user) => user.responsavel_id === filters.responsavel_id);
    if (filters.sem_responsavel) users = users.filter((user) => !user.responsavel_id);
    if (filters.setor_id) users = users.filter((user) => db.membrosTime.some((member) => {
      if (member.usuario_id !== user.id || !member.ativo) return false;
      const team = db.times.find((item) => item.id === member.time_id && item.ativo);
      return team?.setor_id === filters.setor_id;
    }));
    const withSectors = users.map((user) => {
      const sectorIds = new Set([
        ...db.membrosTime.filter((member) => member.usuario_id === user.id && member.ativo)
          .map((member) => db.times.find((team) => team.id === member.time_id && team.ativo)?.setor_id)
          .filter((sectorId): sectorId is string => Boolean(sectorId)),
        ...db.gerentesSetor.filter((manager) => manager.usuario_id === user.id && manager.ativo)
          .map((manager) => manager.setor_id),
      ]);
      return {
        ...user,
        setores: [...sectorIds]
          .map((sectorId) => db.setores.find((sector) => sector.id === sectorId && sector.ativo)?.nome)
          .filter((sectorName): sectorName is string => Boolean(sectorName)),
      };
    });
    return page(withSectors, pageNumber, pageSize);
  },
  obter(userId: string) {
    const user = readDb().usuarios.find((item) => item.id === userId);
    if (!user) throw new Error("Usuário não encontrado.");
    return user;
  },
  criar(body: UsuarioFormValues) {
    return updateDb((db) => {
      const profileId = body.perfil_id || db.perfis.find((profile) => profile.codigo === "USUARIO_PADRAO")!.id;
      const userId = garantirUserIdUnico(db, body.user_id ?? null);
      const user: Usuario = { id: id("mock-user"), nome: body.nome, email: body.email, user_id: userId, ativo: true, perfil_id: profileId, created_at: new Date().toISOString() };
      db.usuarios.unshift(user);
      return user;
    });
  },
  atualizar(userId: string, body: UsuarioFormValues) {
    return updateDb((db) => {
      const user = db.usuarios.find((item) => item.id === userId);
      if (!user) throw new Error("Usuário não encontrado.");
      user.user_id = garantirUserIdUnico(db, body.user_id ?? null, userId);
      user.nome = body.nome; user.email = body.email;
      if (body.perfil_id) user.perfil_id = body.perfil_id;
      return user;
    });
  },
  setActive(userId: string, active: boolean) {
    updateDb((db) => { const user = db.usuarios.find((item) => item.id === userId); if (user) user.ativo = active; });
  },
  setManager(userId: string, managerId: string | null) {
    return updateDb((db) => { const user = db.usuarios.find((item) => item.id === userId); if (!user) throw new Error("Usuário não encontrado."); user.responsavel_id = managerId; return user; });
  },
};

export const mockPerfilApi = {
  listar: () => readDb().perfis,
  listarPermissoes: () => readDb().permissoes,
  criar(nome: string, descricao: string | null, codes: string[]) {
    return updateDb((db) => { const profile: Perfil = { id: id("mock-profile"), nome, descricao, permissoes: codes, codigo: null }; db.perfis.push(profile); return profile; });
  },
  salvarPermissoes(profileId: string, codes: string[]) {
    return updateDb((db) => { const profile = db.perfis.find((item) => item.id === profileId); if (!profile) throw new Error("Perfil não encontrado."); profile.permissoes = codes; return profile; });
  },
  atribuir(usuarioId: string, perfilId: string) {
    updateDb((db) => { const user = db.usuarios.find((item) => item.id === usuarioId); if (user) user.perfil_id = perfilId; });
  },
};

export const mockSetoresApi = {
  listar(pageNumber: number, pageSize: number, active?: boolean, search?: string) {
    const db = readDb();
    const user = db.usuarios.find((item) => item.id === currentMockUserId());
    const profile = user && profileFor(db, user);
    const userTeamIds = new Set(db.membrosTime.filter((member) => member.usuario_id === user?.id && member.ativo).map((member) => member.time_id));
    const managedSectorIds = new Set(db.gerentesSetor.filter((manager) => manager.usuario_id === user?.id && manager.ativo).map((manager) => manager.setor_id));
    let sectors = profile?.codigo === "ADMIN_UNIDADE"
      ? db.setores
      : profile?.codigo === "GERENTE"
        ? db.setores.filter((sector) => managedSectorIds.has(sector.id))
        : profile?.codigo === "KP"
          ? db.setores.filter((sector) => db.times.some((team) => team.setor_id === sector.id && userTeamIds.has(team.id)))
          : [];
    if (active !== undefined) sectors = sectors.filter((sector) => sector.ativo === active);
    if (search) sectors = sectors.filter((sector) => sector.nome.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
    return page(sectors, pageNumber, pageSize);
  },
  criar(nome: string, managerId?: string) {
    return updateDb((db) => { const sector: Setor = { id: id("mock-sector"), unidade_id: db.unidade.id, nome, ativo: true }; db.setores.unshift(sector); if (managerId) db.gerentesSetor.push({ setor_id: sector.id, usuario_id: managerId, ativo: true }); return sector; });
  },
  atualizar(sectorId: string, body: { nome?: string; ativo?: boolean }) {
    return updateDb((db) => { const sector = db.setores.find((item) => item.id === sectorId); if (!sector) throw new Error("Setor não encontrado."); if (body.nome !== undefined) sector.nome = body.nome; if (body.ativo !== undefined) sector.ativo = body.ativo; return sector; });
  },
  gerentes(sectorId: string) { return readDb().gerentesSetor.filter((item) => item.setor_id === sectorId); },
  associar(sectorId: string, userId: string) {
    return updateDb((db) => { let relation = db.gerentesSetor.find((item) => item.setor_id === sectorId && item.usuario_id === userId); if (relation) relation.ativo = true; else { relation = { setor_id: sectorId, usuario_id: userId, ativo: true }; db.gerentesSetor.push(relation); } return relation; });
  },
  desassociar(sectorId: string, userId: string) {
    updateDb((db) => { const relation = db.gerentesSetor.find((item) => item.setor_id === sectorId && item.usuario_id === userId); if (relation) relation.ativo = false; });
  },
};

export const mockTimesApi = {
  listar(pageNumber: number, pageSize: number, filters: { setor_id?: string; ativo?: boolean; busca?: string } = {}) {
    const db = readDb();
    const user = db.usuarios.find((item) => item.id === currentMockUserId());
    const profile = user && profileFor(db, user);
    let teams = user ? db.times.filter((team) => teamInMockScope(db, user.id, profile?.codigo, team)) : [];
    if (filters.setor_id) teams = teams.filter((team) => team.setor_id === filters.setor_id);
    if (filters.ativo !== undefined) teams = teams.filter((team) => team.ativo === filters.ativo);
    if (filters.busca) teams = teams.filter((team) => team.nome.toLocaleLowerCase().includes(filters.busca!.toLocaleLowerCase()));
    return page(teams.map((team) => ({ ...team, setor_nome: db.setores.find((sector) => sector.id === team.setor_id)?.nome })), pageNumber, pageSize);
  },
  criar(body: { nome: string; setor_id: string }) {
    return updateDb((db) => { const team: Time = { id: id("mock-team"), setor_id: body.setor_id, nome: body.nome, gerente_id: null, ativo: true }; db.times.unshift(team); return team; });
  },
  atualizar(teamId: string, body: { nome: string }) {
    return updateDb((db) => { const team = db.times.find((item) => item.id === teamId); if (!team) throw new Error("Time não encontrado."); team.nome = body.nome; return team; });
  },
  definirAtivo(teamId: string, ativo: boolean) {
    return updateDb((db) => { const team = db.times.find((item) => item.id === teamId); if (!team) throw new Error("Time não encontrado."); team.ativo = ativo; if (!ativo) db.membrosTime.filter((item) => item.time_id === teamId).forEach((member) => { member.ativo = false; }); return team; });
  },
  membros(teamId: string) {
    const db = readDb();
    return db.membrosTime.filter((member) => member.time_id === teamId).map((member) => {
      const user = db.usuarios.find((item) => item.id === member.usuario_id);
      const profile = user && profileFor(db, user);
      return { ...member, usuario_nome: user?.nome ?? member.usuario_nome, usuario_user_id: user?.user_id ?? null, usuario_perfil: profile?.nome ?? member.usuario_perfil, usuario_perfil_codigo: profile?.codigo ?? member.usuario_perfil_codigo };
    });
  },
  usuariosDisponiveis() { return readDb().usuarios.filter((user) => user.ativo); },
  adicionar(teamId: string, userId: string) {
    return updateDb((db) => { let member = db.membrosTime.find((item) => item.time_id === teamId && item.usuario_id === userId); if (member) member.ativo = true; else { const user = db.usuarios.find((item) => item.id === userId); const profile = user && profileFor(db, user); member = { id: id("mock-member"), time_id: teamId, usuario_id: userId, usuario_nome: user?.nome, usuario_user_id: user?.user_id ?? null, usuario_perfil: profile?.nome, usuario_perfil_codigo: profile?.codigo, ativo: true }; db.membrosTime.push(member); } return member; });
  },
  remover(teamId: string, userId: string) {
    updateDb((db) => { const member = db.membrosTime.find((item) => item.time_id === teamId && item.usuario_id === userId); if (member) member.ativo = false; });
  },
};

function mockProfile() {
  const db = readDb();
  const user = db.usuarios.find((item) => item.id === currentMockUserId());
  if (!user) throw new Error("Sessão mock inválida.");
  return { db, user, profile: profileFor(db, user) };
}

function requireMockPermission(permission: string) {
  const { profile } = mockProfile();
  if (profile?.codigo !== "ADMIN_UNIDADE" && !profile?.permissoes.includes(permission)) {
    throw new Error("Você não tem permissão para esta ação.");
  }
}

function requireExplicitMockPermission(permission: string) {
  const { profile } = mockProfile();
  if (!profile?.permissoes.includes(permission)) {
    throw new Error("Você não tem permissão para esta ação.");
  }
}

/** Mesma regra do backend (ADR 0036): gerente pelo setor ou como membro; os demais, como membro. */
function teamInMockScope(db: Database, userId: string, profileCode: string | null | undefined, team: Time) {
  return profileCode === "ADMIN_UNIDADE"
    || (profileCode === "GERENTE" && db.gerentesSetor.some((manager) => manager.usuario_id === userId && manager.setor_id === team.setor_id && manager.ativo))
    || db.membrosTime.some((member) => member.usuario_id === userId && member.time_id === team.id && member.ativo);
}

function projectInMockScope(project: Projeto) {
  const { db, user, profile } = mockProfile();
  const team = db.times.find((item) => item.id === project.time_id);
  return Boolean(team && teamInMockScope(db, user.id, profile?.codigo, team));
}

function getMockProject(db: Database, projectId: string) {
  const project = db.projetos.find((item) => item.id === projectId);
  if (!project || !projectInMockScope(project)) throw new Error("Projeto não encontrado ou sem acesso.");
  return project;
}

function createMockProject(input: CriarProjetoInput) {
  const { db, user, profile } = mockProfile();
  requireMockPermission("projetos.gerenciar");
  const team = db.times.find((item) => item.id === input.time_id && item.ativo);
  if (!team) throw new Error("Time não encontrado ou inativo.");
  if (!canManageMockTeam(db, user.id, profile?.codigo, team)) throw new Error("O time está fora do seu escopo.");
  const selectedModels = new Set(input.modelos_ids);
  const models = db.modelosDispositivo.filter((model) => selectedModels.has(model.id) && model.unidade_id === db.unidade.id && model.ativo);
  if (models.length !== selectedModels.size) throw new Error("Selecione apenas modelos de dispositivo ativos da unidade.");
  const now = new Date().toISOString();
  const project: Projeto = {
    id: id("mock-project"), unidade_id: db.unidade.id, time_id: team.id,
    app: input.app.trim(), one_ui: input.one_ui.trim(), nome: input.nome?.trim() || `${input.app.trim()} ${input.one_ui.trim()}`,
    status: "Created", ativo: true, created_at: now, updated_at: now,
  };
  db.projetos.unshift(project);
  input.modelos_ids.forEach((modelId) => db.projetoModelos.push({ projeto_id: project.id, modelo_dispositivo_id: modelId }));
  writeDb(db);
  return project;
}

/** Criar e gerenciar projetos: só admin, gerente e KP, sempre dentro do escopo do time. */
function canManageMockTeam(db: Database, userId: string, profileCode: string | null | undefined, team: Time) {
  return (profileCode === "ADMIN_UNIDADE" || profileCode === "GERENTE" || profileCode === "KP") && teamInMockScope(db, userId, profileCode, team);
}

function normalizarNomeMembro(value: string) {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function normalizarEmailMembro(value: string) {
  return value.normalize("NFC").replace(/\s+/g, "").toLocaleLowerCase();
}

function normalizarUserId(value: string) {
  return value.normalize("NFC").trim().toLocaleLowerCase();
}

function garantirUserIdUnico(db: Database, userId: string | null, ignorarId?: string) {
  const normalized = userId ? normalizarUserId(userId) : "";
  if (!normalized) return null;
  const duplicado = db.usuarios.some((user) =>
    user.id !== ignorarId && user.user_id && normalizarUserId(user.user_id) === normalized,
  );
  if (duplicado) {
    throw new ApiError({
      type: "about:blank",
      title: "User ID duplicado.",
      status: 409,
      errors: [{ campo: "user_id", mensagem: "Já existe um usuário com este User ID nesta unidade." }],
    });
  }
  return userId?.trim() || null;
}

export const mockProjetosApi = {
  listar(pageNumber: number, pageSize: number, associadosAMim = false) {
    const { profile } = mockProfile();
    if (profile?.codigo !== "ADMIN_UNIDADE" && !profile?.permissoes.includes("projetos.consultar") && !profile?.permissoes.includes("test_cases.consultar")) {
      throw new Error("Você não tem permissão para consultar projetos.");
    }
    const { db, user } = mockProfile();
    const projects = db.projetos.filter((project) => project.ativo && project.unidade_id === db.unidade.id && projectInMockScope(project)
      && (!associadosAMim || db.casosTeste.some((item) => item.projeto_id === project.id && item.unidade_id === db.unidade.id && item.ativo && (item.responsavel_id === user.id || item.backup_id === user.id))))
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "") || a.id.localeCompare(b.id))
      .map((project) => ({
        ...project,
        modelos_ids: db.projetoModelos
          .filter((link) => link.projeto_id === project.id && link.ativo !== false)
          .filter((link) => db.modelosDispositivo.some((model) => model.id === link.modelo_dispositivo_id && model.ativo))
          .map((link) => link.modelo_dispositivo_id),
        modelos_dispositivo: db.projetoModelos
          .filter((link) => link.projeto_id === project.id && link.ativo !== false)
          .flatMap((link) => db.modelosDispositivo.find((model) => model.id === link.modelo_dispositivo_id)?.nome ?? []),
      }));
    return page(projects, pageNumber, pageSize);
  },
  obter(projectId: string) {
    const { profile } = mockProfile();
    if (profile?.codigo !== "ADMIN_UNIDADE" && !profile?.permissoes.includes("projetos.consultar") && !profile?.permissoes.includes("test_cases.consultar")) {
      throw new Error("Você não tem permissão para consultar projetos.");
    }
    const { db } = mockProfile();
    return getMockProject(db, projectId);
  },
  criar(input: CriarProjetoInput) {
    return createMockProject(input);
  },
  atualizar(projectId: string, input: AtualizarProjetoInput) {
    requireMockPermission("projetos.gerenciar");
    const { db, user, profile } = mockProfile();
    const project = getMockProject(db, projectId);
    if (!project.ativo) throw new Error("Projeto não encontrado.");
    const currentTeam = db.times.find((item) => item.id === project.time_id);
    if (!currentTeam || !canManageMockTeam(db, user.id, profile?.codigo, currentTeam)) throw new Error("O time está fora do seu escopo.");
    const targetTeam = db.times.find((item) => item.id === input.time_id && item.ativo);
    if (!targetTeam) throw new Error("Time não encontrado ou inativo.");
    if (!canManageMockTeam(db, user.id, profile?.codigo, targetTeam)) throw new Error("O time está fora do seu escopo.");
    if (targetTeam.id !== project.time_id) {
      const cases = db.casosTeste.filter((testCase) => testCase.projeto_id === projectId && testCase.ativo);
      const memberships = new Set(db.membrosTime.filter((member) => member.time_id === targetTeam.id && member.ativo).map((member) => member.usuario_id));
      if (cases.some((testCase) => !memberships.has(testCase.responsavel_id) || Boolean(testCase.backup_id && !memberships.has(testCase.backup_id)))) {
        throw new Error("Não é possível trocar o time enquanto houver responsáveis ou backups fora do time de destino.");
      }
    }
    const selectedModels = new Set(input.modelos_ids);
    const models = db.modelosDispositivo.filter((model) => selectedModels.has(model.id) && model.unidade_id === db.unidade.id && model.ativo);
    if (models.length !== selectedModels.size) throw new Error("Selecione apenas modelos de dispositivo ativos da unidade.");
    if (selectedModels.size !== input.modelos_ids.length) throw new Error("A lista contém modelos de dispositivo duplicados.");
    project.time_id = targetTeam.id;
    project.nome = input.nome.trim();
    project.app = input.app.trim();
    project.one_ui = input.one_ui.trim();
    db.projetoModelos.filter((link) => link.projeto_id === projectId).forEach((link) => { link.ativo = selectedModels.has(link.modelo_dispositivo_id); });
    input.modelos_ids.forEach((modelId) => {
      if (!db.projetoModelos.some((link) => link.projeto_id === projectId && link.modelo_dispositivo_id === modelId)) {
        db.projetoModelos.push({ projeto_id: projectId, modelo_dispositivo_id: modelId, ativo: true });
      }
    });
    project.updated_at = new Date().toISOString();
    writeDb(db);
    return project;
  },
  excluir(projectId: string) {
    requireMockPermission("projetos.gerenciar");
    const { db, user, profile } = mockProfile();
    const project = getMockProject(db, projectId);
    const team = db.times.find((item) => item.id === project.time_id);
    if (!team || !canManageMockTeam(db, user.id, profile?.codigo, team)) throw new Error("O time está fora do seu escopo.");
    project.ativo = false;
    project.updated_at = new Date().toISOString();
    writeDb(db);
  },
  async importar(file: File, timeId: string, modelIds: string[], app?: string, oneUi?: string) {
    requireMockPermission("projetos.gerenciar");
    // Como o backend (ADR 0033): com a planilha inválida, ainda confere as pessoas e devolve tudo junto.
    let planilha: PlanilhaProjeto | null = null;
    let erros: ProblemDetailsError[] = [];
    let pessoas: PessoasDaLinha[];
    let colunas: PlanilhaProjeto["colunas"];
    let totalLinhas: number | undefined;
    try {
      planilha = await lerPlanilhaProjeto(file);
      ({ colunas, totalLinhas } = planilha);
      pessoas = planilha.casos;
    } catch (error) {
      if (!(error instanceof PlanilhaProjetoError)) throw error;
      erros = error.errors.map((erro) => ({ ...erro, campo: erro.linha ? `linha.${erro.linha}.${erro.coluna}` : "planilha", mensagem: "Valor inválido na planilha." }));
      if (!error.pessoas.length || !error.colunas) throw new ApiError({ type: "about:blank", title: "Planilha inválida.", status: 422, errors: erros, total_linhas: error.totalLinhas });
      ({ pessoas, colunas, totalLinhas } = { pessoas: error.pessoas, colunas: error.colunas, totalLinhas: error.totalLinhas });
    }
    const { db, user, profile } = mockProfile();
    const time = db.times.find((item) => item.id === timeId && item.ativo);
    if (!time) throw new Error("Time não encontrado ou inativo.");
    if (!canManageMockTeam(db, user.id, profile?.codigo, time)) throw new Error("O time está fora do seu escopo.");
    const selectedModels = new Set(modelIds);
    const models = db.modelosDispositivo.filter((model) => selectedModels.has(model.id) && model.unidade_id === db.unidade.id && model.ativo);
    if (models.length !== selectedModels.size) throw new Error("Selecione apenas modelos de dispositivo ativos da unidade.");
    const membros = new Set(db.membrosTime.filter((member) => member.time_id === time.id && member.ativo).map((member) => member.usuario_id));
    const usuarios = db.usuarios.filter((user) => user.ativo);
    const resolver = (linha: number, campo: "assignees" | "backup", coluna: string, identificador: string) => {
      if (!identificador) return null; // A célula vazia já foi reportada na leitura.
      const nomeInformado = normalizarNomeMembro(identificador);
      const emailInformado = normalizarEmailMembro(identificador);
      const userIdInformado = normalizarUserId(identificador);
      const found = usuarios.filter((user) => normalizarNomeMembro(user.nome) === nomeInformado || normalizarEmailMembro(user.email) === emailInformado || Boolean(user.user_id && normalizarUserId(user.user_id) === userIdInformado));
      const doTime = found.filter((user) => membros.has(user.id));
      if (found.length === 1 && doTime.length === 1) return doTime[0].id;
      const codigo = !found.length ? "pessoa_nao_encontrada" : found.length > 1 ? "pessoa_ambigua" : "pessoa_fora_do_time";
      const mensagem = { pessoa_nao_encontrada: "Pessoa não encontrada na unidade.", pessoa_ambigua: "Mais de uma pessoa corresponde a este valor.", pessoa_fora_do_time: "A pessoa precisa ser membro ativo do time." }[codigo];
      erros.push({ campo: `linha.${linha}.${campo}`, mensagem, codigo, linha, coluna, valor: identificador });
      return null;
    };
    const atribuicoes = new Map<number, { responsavelId: string; backupId: string }>();
    for (const linha of pessoas) {
      const responsavelId = resolver(linha.linha, "assignees", colunas.assignees, linha.responsavel);
      const backupId = resolver(linha.linha, "backup", colunas.backup, linha.backup);
      if (!responsavelId || !backupId) continue;
      if (responsavelId === backupId) {
        erros.push({ campo: `linha.${linha.linha}.backup`, mensagem: "Responsável principal e backup devem ser pessoas distintas.", codigo: "responsavel_igual_backup", linha: linha.linha, coluna: colunas.backup, valor: linha.backup });
        continue;
      }
      atribuicoes.set(linha.linha, { responsavelId, backupId });
    }
    if (erros.length || !planilha) {
      // Gerais primeiro; depois por linha (a ordenação é estável dentro da linha).
      erros.sort((a, b) => (a.linha ?? 0) - (b.linha ?? 0));
      throw new ApiError({ type: "about:blank", title: "Planilha inválida.", status: 422, errors: erros, total_linhas: totalLinhas });
    }
    const atribuidos = planilha.casos.map((caso) => ({ caso, ...atribuicoes.get(caso.linha)! }));
    const nomeApp = planilha.app || app?.trim() || "";
    const versao = planilha.one_ui || oneUi?.trim() || "";
    const now = new Date().toISOString();
    const projeto: Projeto = { id: id("mock-project"), unidade_id: db.unidade.id, time_id: time.id, app: nomeApp, one_ui: versao, nome: `${nomeApp} ${versao}`, status: "Created", ativo: true, created_at: now, updated_at: now };
    const casos: CasoTeste[] = atribuidos.map(({ caso, responsavelId, backupId }) => ({ id: id("mock-test-case"), unidade_id: db.unidade.id, projeto_id: projeto.id, tc_id: caso.tc_id, category: caso.category, difficulty: caso.difficulty, situation: caso.situation, status: "To-Do", responsavel_id: responsavelId, backup_id: backupId, ativo: true, created_at: now, updated_at: now }));
    db.projetos.unshift(projeto);
    modelIds.forEach((modelId) => db.projetoModelos.push({ projeto_id: projeto.id, modelo_dispositivo_id: modelId }));
    db.casosTeste.unshift(...casos);
    writeDb(db);
    return { projeto, quantidade_casos: atribuidos.length };
  },
  atualizarStatus(projectId: string, status: StatusProjeto) {
    requireMockPermission("projetos.gerenciar");
    const { db } = mockProfile();
    const project = getMockProject(db, projectId);
    project.status = status;
    project.updated_at = new Date().toISOString();
    writeDb(db);
    return project;
  },
};

function canManageMockProject(project: Projeto, permission: string) {
  requireMockPermission(permission);
  return projectInMockScope(project);
}

function getMockCase(db: Database, caseId: string) {
  const testCase = db.casosTeste.find((item) => item.id === caseId);
  if (!testCase) throw new Error("Test Case não encontrado.");
  const project = getMockProject(db, testCase.projeto_id);
  return { testCase, project };
}

export const mockCasosTesteApi = {
  listar(projectId: string, pageNumber: number, pageSize: number, filtros: { responsavelId?: string; associadosAMim?: boolean; semana?: string } = {}) {
    requireMockPermission("test_cases.consultar");
    const { db, user } = mockProfile();
    if (!getMockProject(db, projectId).ativo) throw new Error("Projeto não encontrado.");
    const casosDoProjeto = db.casosTeste.filter((item) => item.projeto_id === projectId && item.ativo
      && item.unidade_id === db.unidade.id
      && (!filtros.associadosAMim || item.responsavel_id === user.id || item.backup_id === user.id)
      && (!filtros.semana || (item.status === "Done" && Boolean(item.updated_at ?? item.created_at) && semanaIso((item.updated_at ?? item.created_at)!) === filtros.semana))
      && (!filtros.responsavelId || item.responsavel_id === filtros.responsavelId));
    // Igual à API: os casos em que o usuário é o responsável principal vêm primeiro.
    const prioridade = (item: (typeof casosDoProjeto)[number]) => (item.responsavel_id === user.id ? 0 : 1);
    casosDoProjeto.sort((a, b) => prioridade(a) - prioridade(b) || a.tc_id.localeCompare(b.tc_id));
    return page(casosDoProjeto, pageNumber, pageSize);
  },
  obter(caseId: string) {
    requireMockPermission("test_cases.consultar");
    const { db } = mockProfile();
    return getMockCase(db, caseId).testCase;
  },
  criar(projectId: string, input: CriarCasoTesteInput) {
    const { db } = mockProfile();
    const project = getMockProject(db, projectId);
    if (!canManageMockProject(project, "test_cases.gerenciar")) throw new Error("O projeto está fora do seu escopo.");
    const tcId = input.tc_id.trim();
    if (db.casosTeste.some((item) => item.projeto_id === projectId && item.tc_id.toLocaleLowerCase() === tcId.toLocaleLowerCase())) {
      throw new Error(`O TC ID ${tcId} já foi cadastrado para este projeto.`);
    }
    const validMembers = new Set(db.membrosTime.filter((member) => member.time_id === project.time_id && member.ativo).map((member) => member.usuario_id));
    if (!validMembers.has(input.responsavel_id) || !validMembers.has(input.backup_id) || input.responsavel_id === input.backup_id) {
      throw new Error("Responsável e backup devem ser pessoas distintas que pertençam ao time do projeto.");
    }
    const now = new Date().toISOString();
    const testCase: CasoTeste = {
      id: id("mock-test-case"), unidade_id: db.unidade.id, projeto_id: projectId, tc_id: tcId,
      category: input.category, difficulty: input.difficulty, situation: input.situation, status: "To-Do",
      responsavel_id: input.responsavel_id, backup_id: input.backup_id, ativo: true,
      created_at: now, updated_at: now,
    };
    db.casosTeste.unshift(testCase);
    writeDb(db);
    return testCase;
  },
  atualizar(caseId: string, input: AtualizarCasoTesteInput) {
    const { db, user, profile } = mockProfile();
    const { testCase, project } = getMockCase(db, caseId);
    if (profile?.codigo === "ADMIN_UNIDADE" || profile?.codigo === "GERENTE" || profile?.codigo === "KP") {
      if (!canManageMockProject(project, "test_cases.gerenciar")) throw new Error("O projeto está fora do seu escopo.");
      Object.assign(testCase, input);
    } else {
      if (!profile?.permissoes.includes("test_cases.consultar") || (testCase.responsavel_id !== user.id && testCase.backup_id !== user.id)) {
        throw new Error("Você só pode editar Test Cases atribuídos a você.");
      }
      if (testCase.responsavel_id !== user.id) {
        if (Object.keys(input).length !== 1 || input.status !== "Cancelled") throw new Error("O Backup só pode cancelar o Test Case atribuído.");
        Object.assign(testCase, input);
        testCase.updated_at = new Date().toISOString();
        writeDb(db);
        return testCase;
      }
      const camposPermitidos = ["category", "difficulty", "status", "situation"];
      if (Object.keys(input).some((field) => !camposPermitidos.includes(field))) throw new Error("Você só pode editar Status, TC Situation, Category e Difficulty.");
      if (input.status) {
        if (!opcoesStatusResponsavel(testCase.status).includes(input.status)) throw new Error("A transição de Status solicitada não é permitida.");
      }
      Object.assign(testCase, input);
    }
    testCase.updated_at = new Date().toISOString();
    writeDb(db);
    return testCase;
  },
  transferirParaBackup(caseId: string) {
    const { db, user } = mockProfile();
    requireMockPermission("test_cases.consultar");
    const { testCase } = getMockCase(db, caseId);
    if (testCase.responsavel_id !== user.id || !testCase.backup_id) throw new Error("O Test Case não pode ser transferido para o backup.");
    testCase.responsavel_id = testCase.backup_id;
    testCase.backup_id = null;
    testCase.updated_at = new Date().toISOString();
    writeDb(db);
    return testCase;
  },
};

const nomeModeloDuplicado = () => new ApiError({ type: "about:blank", title: "Conflito.", status: 409, detail: "Já existe um modelo de dispositivo com este nome." });

export const mockModelosDispositivoApi = {
  listar(pageNumber: number, pageSize: number, active?: boolean, search?: string) {
    requireExplicitMockPermission("modelos_dispositivo.gerenciar");
    const { db } = mockProfile();
    let models = [...db.modelosDispositivo];
    if (active !== undefined) models = models.filter((model) => model.ativo === active);
    if (search) models = models.filter((model) => model.nome.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
    // Mesma ordem da API (nome), para a paginação do mock refletir a real.
    return page(models.sort((a, b) => a.nome.localeCompare(b.nome)), pageNumber, pageSize);
  },
  listarOpcoes(pageNumber: number, pageSize: number) {
    const { db, profile } = mockProfile();
    if (profile?.codigo !== "ADMIN_UNIDADE" && !profile?.permissoes.includes("projetos.gerenciar")) requireExplicitMockPermission("modelos_dispositivo.gerenciar");
    const models = db.modelosDispositivo.filter((model) => model.ativo).map(({ id: modelId, nome, descricao }) => ({ id: modelId, nome, descricao }));
    return page(models, pageNumber, pageSize);
  },
  criar(body: { nome: string; descricao: string | null }) {
    requireExplicitMockPermission("modelos_dispositivo.gerenciar");
    return updateDb((db) => {
      const normalized = body.nome.trim();
      if (!normalized) throw new Error("O nome do modelo é obrigatório.");
      if (db.modelosDispositivo.some((model) => model.nome === normalized)) throw nomeModeloDuplicado();
      const now = new Date().toISOString();
      const model: ModeloDispositivo = { id: id("mock-model"), unidade_id: db.unidade.id, nome: normalized, descricao: body.descricao?.trim() || null, ativo: true, created_at: now, updated_at: now };
      db.modelosDispositivo.unshift(model);
      return model;
    });
  },
  atualizar(modelId: string, body: { nome?: string; descricao?: string | null; ativo?: boolean }) {
    requireExplicitMockPermission("modelos_dispositivo.gerenciar");
    return updateDb((db) => {
      const model = db.modelosDispositivo.find((item) => item.id === modelId);
      if (!model) throw new Error("Modelo de dispositivo não encontrado.");
      const name = body.nome?.trim();
      if (name && db.modelosDispositivo.some((item) => item.id !== modelId && item.nome === name)) throw nomeModeloDuplicado();
      if (name) model.nome = name;
      if (body.descricao !== undefined) model.descricao = body.descricao?.trim() || null;
      if (body.ativo !== undefined) model.ativo = body.ativo;
      model.updated_at = new Date().toISOString();
      return model;
    });
  },
  definirAtivo(modelId: string, active: boolean) {
    return this.atualizar(modelId, { ativo: active });
  },
};

/** Execução da rodada atual do TC (a mais recente), como `obter_rodada_atual_do_caso` na API. */
function execucaoDaRodadaAtual(db: Database, casoTesteId: string) {
  return db.execucoesFormFactor
    .filter((execucao) => execucao.caso_teste_id === casoTesteId)
    .sort((a, b) => b.data_reportada.localeCompare(a.data_reportada) || a.execucao_id.localeCompare(b.execucao_id))[0];
}

function semanaIso(value: string) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const firstThursday = new Date(date.getFullYear(), 0, 4);
  const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function projetosMockFormFactorGlobal(db: Database) {
  const { user, profile } = mockProfile();
  if (
    !profile || !profile.codigo || !["ADMIN_UNIDADE", "GERENTE", "KP"].includes(profile.codigo) ||
    !profile.permissoes.includes("form_factor.consultar")
  ) throw new Error("Você não tem permissão para consultar Resultados Gerais.");
  if (profile.codigo === "ADMIN_UNIDADE") return db.projetos.filter((project) => project.ativo);
  const setoresGerenciados = new Set(db.gerentesSetor
    .filter((item) => item.usuario_id === user.id && item.ativo)
    .map((item) => item.setor_id));
  const timesDoUsuario = new Set(db.membrosTime
    .filter((item) => item.usuario_id === user.id && item.ativo)
    .map((item) => item.time_id));
  return db.projetos.filter((project) => {
    const team = db.times.find((item) => item.id === project.time_id && item.ativo);
    if (!project.ativo || !team) return false;
    return profile.codigo === "GERENTE"
      ? setoresGerenciados.has(team.setor_id)
      : timesDoUsuario.has(team.id);
  });
}

function responsaveisMockFormFactorGlobal(db: Database, projetoIds: Set<string>) {
  const ids = new Set(db.casosTeste
    .filter((testCase) => testCase.ativo && projetoIds.has(testCase.projeto_id))
    .map((testCase) => testCase.responsavel_id));
  return db.usuarios
    .filter((user) => ids.has(user.id))
    .map((user) => ({ id: user.id, identificador: user.user_id || user.nome }))
    .sort((a, b) => a.identificador.localeCompare(b.identificador) || a.id.localeCompare(b.id));
}

function filtrarResultadosGlobais<T extends LinhaFormFactor>(
  rows: T[], filtros: FiltrosFormFactorGlobal,
) {
  return rows.filter((row) =>
    (!filtros.responsavelId || row.responsavel_id === filtros.responsavelId) &&
    (!filtros.tcId || row.tc_id.toLocaleLowerCase().includes(filtros.tcId.toLocaleLowerCase())) &&
    (!filtros.sdfId || (row.sdf_id ?? "").toLocaleLowerCase().includes(filtros.sdfId.toLocaleLowerCase()))
  );
}

export const mockFormFactorApi = {
  listarGlobal(filtros: FiltrosFormFactorGlobal = {}): FormFactorGlobal {
    const { db } = mockProfile();
    const projetos = projetosMockFormFactorGlobal(db).filter((project) => !filtros.projetoId || project.id === filtros.projetoId);
    const projectIds = new Set(projetos.map((project) => project.id));
    const modelos = db.projetoModelos
      .filter((link) => projectIds.has(link.projeto_id))
      .map((link) => db.modelosDispositivo.find((model) => model.id === link.modelo_dispositivo_id))
      .filter((model) => model?.ativo)
      .map((model) => ({ id: model!.id, nome: model!.nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome) || a.id.localeCompare(b.id));
    const rows = projetos.flatMap((project) => {
      const modelIds = db.projetoModelos.filter((link) => link.projeto_id === project.id)
        .map((link) => link.modelo_dispositivo_id);
      const linked = new Set(modelIds);
      return db.casosTeste.filter((testCase) => testCase.projeto_id === project.id && testCase.ativo)
        .flatMap<LinhaFormFactor & { projeto_id: string; projeto_nome: string; modelos_ids: string[] }>((testCase) => {
          const allResults = [...db.formFactor].reverse()
            .filter((result) => (result.caso_teste_id === testCase.id || result.tc_id === testCase.tc_id) && linked.has(result.modelo_dispositivo_id) &&
              (!filtros.semana || semanaIso(result.data_reportada) === filtros.semana));
          if (filtros.semana && !allResults.length) return [];
          const resultados: Record<string, string> = {};
          for (const result of allResults) resultados[result.modelo_dispositivo_id] ??= result.resultado;
          if (filtros.sdfId && !allResults.some((result) => (result.sdf_id ?? "").toLowerCase().includes(filtros.sdfId!.toLowerCase()))) return [];
          if (filtros.modeloDispositivoId && !allResults.some((result) => result.modelo_dispositivo_id === filtros.modeloDispositivoId && (!filtros.resultado || result.resultado.toLowerCase() === filtros.resultado.toLowerCase()))) return [];
          if (!filtros.modeloDispositivoId && filtros.resultado && !allResults.some((result) => result.resultado.toLowerCase() === filtros.resultado!.toLowerCase())) return [];
          const linha = {
            caso_teste_id: testCase.id,
            tc_id: testCase.tc_id,
            responsavel_id: testCase.responsavel_id,
            sdf_id: allResults[0]?.sdf_id ?? null,
            data_reportada: allResults[0]?.data_reportada ?? null,
            resultados,
            projeto_id: project.id,
            projeto_nome: project.nome,
            modelos_ids: modelIds,
          };
          return filtrarResultadosGlobais([linha], filtros);
        });
    }).sort((a, b) => a.projeto_nome.localeCompare(b.projeto_nome) || a.tc_id.localeCompare(b.tc_id));
    return {
      ...page(rows, filtros.page ?? 1, filtros.pageSize ?? 20),
      modelos,
      responsaveis: responsaveisMockFormFactorGlobal(db, projectIds),
    };
  },
  listarResultadosGlobais(filtros: FiltrosFormFactorGlobal = {}): FormFactorResultadosGlobais {
    const { db } = mockProfile();
    const projetos = projetosMockFormFactorGlobal(db).filter((project) => !filtros.projetoId || project.id === filtros.projetoId);
    const projectIds = new Set(projetos.map((project) => project.id));
    const modelos = db.projetoModelos
      .filter((link) => projectIds.has(link.projeto_id))
      .map((link) => db.modelosDispositivo.find((model) => model.id === link.modelo_dispositivo_id))
      .filter((model) => model?.ativo)
      .map((model) => ({ id: model!.id, nome: model!.nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome) || a.id.localeCompare(b.id));
    const groups = new Map<string, ResultadoFormFactorMock[]>();
    db.formFactor.forEach((item) => {
      const execucao = item.execucao_id ?? `legacy-${item.caso_teste_id}-${item.tc_id}-${item.sdf_id ?? "manual"}-${item.data_reportada}`;
      const values = groups.get(execucao) ?? [];
      values.push(item);
      groups.set(execucao, values);
    });
    const rows = [...groups.entries()].flatMap(([execucao_id, values]) => {
      const first = values[0];
      const testCase = db.casosTeste.find((item) => item.id === first.caso_teste_id ||
        (item.tc_id === first.tc_id && projectIds.has(item.projeto_id)));
      if (!testCase || !testCase.ativo || !projectIds.has(testCase.projeto_id)) return [];
      const project = projetos.find((item) => item.id === testCase.projeto_id)!;
      if (filtros.semana && semanaIso(first.data_reportada) !== filtros.semana) return [];
      if (filtros.origem && (first.origem ?? "SDF") !== filtros.origem) return [];
      const modelIds = db.projetoModelos.filter((link) => link.projeto_id === project.id)
        .map((link) => link.modelo_dispositivo_id);
      const resultados: Record<string, string> = Object.fromEntries(values
        .filter((item) => modelIds.includes(item.modelo_dispositivo_id))
        .map((item) => [item.modelo_dispositivo_id, item.resultado]));
      if (!Object.keys(resultados).length) return [];
      const row: FormFactorExecucaoGlobal = {
        execucao_id,
        caso_teste_id: testCase.id,
        tc_id: testCase.tc_id,
        responsavel_id: testCase.responsavel_id,
        sdf_id: first.sdf_id,
        data_reportada: first.data_reportada,
        origem: first.origem ?? "SDF",
        resultados,
        projeto_id: project.id,
        projeto_nome: project.nome,
        modelos_ids: modelIds,
      };
      if (filtros.responsavelId && row.responsavel_id !== filtros.responsavelId) return [];
      if (filtros.tcId && !row.tc_id.toLowerCase().includes(filtros.tcId.toLowerCase())) return [];
      if (filtros.sdfId && !(row.sdf_id ?? "").toLowerCase().includes(filtros.sdfId.toLowerCase())) return [];
      if (filtros.modeloDispositivoId && !row.resultados[filtros.modeloDispositivoId]) return [];
      if (filtros.resultado && !Object.entries(row.resultados).some(([modelId, value]) =>
        (!filtros.modeloDispositivoId || modelId === filtros.modeloDispositivoId) && value.toLowerCase() === filtros.resultado!.toLowerCase()
      )) return [];
      return [row];
    }).sort((a, b) => b.data_reportada.localeCompare(a.data_reportada) || a.execucao_id.localeCompare(b.execucao_id));
    return {
      ...page(rows, filtros.page ?? 1, filtros.pageSize ?? 20),
      modelos,
      responsaveis: responsaveisMockFormFactorGlobal(db, projectIds),
    };
  },
  listar(projectId: string, filtros: FiltrosFormFactor = {}): FormFactorMatriz {
    requireMockPermission("form_factor.consultar");
    const { db } = mockProfile();
    getMockProject(db, projectId);
    const { page: pageNumber = 1, pageSize = 20, semana: week, responsavelId, tcId, sdfId, modeloDispositivoId, resultado } = filtros;
    const modelos = db.projetoModelos
      .filter((link) => link.projeto_id === projectId && link.ativo !== false)
      .map((link) => db.modelosDispositivo.find((model) => model.id === link.modelo_dispositivo_id))
      .filter((model) => model !== undefined)
      .map(({ id: modelId, nome }) => ({ id: modelId, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
    const linkedModels = new Set(modelos.map((model) => model.id));
    const rows = db.casosTeste
      .filter((testCase) => testCase.projeto_id === projectId && testCase.ativo && testCase.status === "InValidation" && (!responsavelId || testCase.responsavel_id === responsavelId) && (!tcId || testCase.tc_id.toLocaleLowerCase().includes(tcId.toLocaleLowerCase())))
      .sort((a, b) => a.tc_id.localeCompare(b.tc_id))
      .flatMap<LinhaFormFactor>((testCase) => {
        // Corte do caso (RN-12 da 022): o Resumo ignora resultados anteriores à rodada mais recente dele.
        const execucaoAtual = execucaoDaRodadaAtual(db, testCase.id);
        const corte = execucaoAtual?.data_reportada;
        // Ordem invertida antes do sort estável: na mesma data vence a importação mais recente, como na API.
        const results = [...db.formFactor].reverse()
          .filter((result) => result.tc_id === testCase.tc_id && linkedModels.has(result.modelo_dispositivo_id) && (!corte || result.data_reportada >= corte) && (!week || semanaIso(result.data_reportada) === week))
          .sort((a, b) => b.data_reportada.localeCompare(a.data_reportada));
        if (week && !results.length) return [];
        if (sdfId && !results.some((result) => (result.sdf_id ?? "").toLocaleLowerCase().includes(sdfId.toLocaleLowerCase()))) return [];
        if (modeloDispositivoId && !results.some((result) => result.modelo_dispositivo_id === modeloDispositivoId && (!resultado || result.resultado.toLocaleLowerCase() === resultado.toLocaleLowerCase()))) return [];
        const resultados: Record<string, string> = {};
        results.forEach((result) => { resultados[result.modelo_dispositivo_id] ??= result.resultado; });
        // RN-13 da 022: só a rodada atual fica pendente; as anteriores sem resultado ficam encerradas.
        const pendente = execucaoAtual && !execucaoAtual.resultados_registrados ? execucaoAtual : undefined;
        return [{ caso_teste_id: testCase.id, tc_id: testCase.tc_id, responsavel_id: testCase.responsavel_id, backup_id: testCase.backup_id, rodada_pendente_id: pendente?.rodada_id ?? null, sdf_id: pendente?.sdf_id ?? results[0]?.sdf_id ?? null, data_reportada: results[0]?.data_reportada ?? null, resultados }];
      });
    const casosElegiveis = db.casosTeste
      .filter((testCase) => testCase.projeto_id === projectId && testCase.ativo && testCase.status === "InValidation")
      .sort((a, b) => a.tc_id.localeCompare(b.tc_id))
      .map((testCase) => ({ caso_teste_id: testCase.id, tc_id: testCase.tc_id, responsavel_id: testCase.responsavel_id, backup_id: testCase.backup_id }));
    return { ...page(rows, pageNumber, pageSize), modelos, casos_elegiveis: casosElegiveis };
  },
  listarResultados(projectId: string, filtros: FiltrosFormFactor = {}): FormFactorResultados {
    requireMockPermission("form_factor.consultar");
    const { db } = mockProfile();
    getMockProject(db, projectId);
    const { page: pageNumber = 1, pageSize = 20, semana, responsavelId, tcId, sdfId, origem, modeloDispositivoId, resultado } = filtros;
    const modelos = db.projetoModelos.filter((link) => link.projeto_id === projectId).map((link) => db.modelosDispositivo.find((item) => item.id === link.modelo_dispositivo_id)).filter((item) => item !== undefined).map(({ id: modelId, nome }) => ({ id: modelId, nome }));
    const linked = new Set(modelos.map((item) => item.id));
    const groups = new Map<string, ResultadoFormFactorMock[]>();
    db.formFactor.forEach((item) => {
      const executionId = item.execucao_id ?? `legacy-${item.caso_teste_id}-${item.tc_id}-${item.sdf_id ?? "manual"}-${item.data_reportada}`;
      const values = groups.get(executionId) ?? [];
      values.push(item);
      groups.set(executionId, values);
    });
    const rows: FormFactorExecucao[] = [...groups.entries()].flatMap(([execucao_id, values]) => {
      const first = values[0];
      const testCase = db.casosTeste.find((item) => item.id === first.caso_teste_id || (item.projeto_id === projectId && item.tc_id === first.tc_id));
      if (!testCase || testCase.projeto_id !== projectId || !testCase.ativo) return [];
      const data_reportada = first.data_reportada;
      if (semana && semanaIso(data_reportada) !== semana) return [];
      if (responsavelId && testCase.responsavel_id !== responsavelId) return [];
      if (tcId && !testCase.tc_id.toLocaleLowerCase().includes(tcId.toLocaleLowerCase())) return [];
      if (sdfId && !values.some((item) => (item.sdf_id ?? "").toLocaleLowerCase().includes(sdfId.toLocaleLowerCase()))) return [];
      if (origem && (first.origem ?? "SDF") !== origem) return [];
      if (modeloDispositivoId && !values.some((item) => item.modelo_dispositivo_id === modeloDispositivoId && (!resultado || item.resultado.toLowerCase() === resultado.toLowerCase()))) return [];
      const resultados = Object.fromEntries(values.filter((item) => linked.has(item.modelo_dispositivo_id)).map((item) => [item.modelo_dispositivo_id, item.resultado]));
      if (!Object.keys(resultados).length) return [];
      const rodadaExecucao = db.execucoesFormFactor.find((item) => item.execucao_id === execucao_id);
      return [{ execucao_id, caso_teste_id: testCase.id, tc_id: testCase.tc_id, responsavel_id: testCase.responsavel_id, sdf_id: first.sdf_id, data_reportada, origem: first.origem ?? "SDF", resultados, rodada_id: rodadaExecucao?.rodada_id ?? null, resultados_registrados: rodadaExecucao?.resultados_registrados ?? true }];
    });
    db.execucoesFormFactor.forEach((execucao) => {
      if (groups.has(execucao.execucao_id)) return;
      const testCase = db.casosTeste.find((item) => item.id === execucao.caso_teste_id && item.projeto_id === projectId && item.ativo);
      if (!testCase || (semana && semanaIso(execucao.data_reportada) !== semana)) return;
      if (responsavelId && testCase.responsavel_id !== responsavelId) return;
      if (tcId && !testCase.tc_id.toLocaleLowerCase().includes(tcId.toLocaleLowerCase())) return;
      if (sdfId && !(execucao.sdf_id ?? "").toLocaleLowerCase().includes(sdfId.toLocaleLowerCase())) return;
      if (origem && origem !== "MANUAL") return;
      rows.push({ execucao_id: execucao.execucao_id, caso_teste_id: testCase.id, tc_id: testCase.tc_id, responsavel_id: testCase.responsavel_id, sdf_id: execucao.sdf_id, data_reportada: execucao.data_reportada, origem: "MANUAL", resultados: {}, rodada_id: execucao.rodada_id, resultados_registrados: execucao.resultados_registrados });
    });
    rows.sort((a, b) => b.data_reportada.localeCompare(a.data_reportada));
    return { ...page(rows, pageNumber, pageSize), modelos };
  },
  criarRodada(projectId: string, input: CriarRodadaFormFactorInput): RodadaFormFactor {
    const { db, profile } = mockProfile();
    requireMockPermission("form_factor.registrar");
    if (!["ADMIN_UNIDADE", "GERENTE", "KP"].includes(profile?.codigo ?? "")) throw new Error("Somente Admin, Gerente ou KP podem iniciar uma rodada.");
    getMockProject(db, projectId);
    if (input.sdf_id != null && input.sdf_id.length > 50) throw new Error("SDF ID deve ter no máximo 50 caracteres.");
    const testCases = db.casosTeste.filter((item) => item.projeto_id === projectId && item.ativo && item.status === "InValidation");
    if (!testCases.length) throw new Error("Não há Test Cases em In Validation para iniciar uma rodada.");
    const rodada: RodadaFormFactor = { id: id("mock-form-factor-round"), projeto_id: projectId, sdf_id: input.sdf_id ?? null, created_at: new Date().toISOString(), total_test_cases: testCases.length };
    db.rodadasFormFactor.unshift(rodada);
    testCases.forEach((testCase) => db.execucoesFormFactor.push({ execucao_id: id("mock-sdf-execution"), rodada_id: rodada.id, projeto_id: projectId, caso_teste_id: testCase.id, sdf_id: rodada.sdf_id, data_reportada: rodada.created_at, resultados_registrados: false }));
    writeDb(db);
    return rodada;
  },
  registrarResultadosRodada(projectId: string, rodadaId: string, casoTesteId: string, input: EnviarResultadosRodadaInput): FormFactorExecucao {
    requireMockPermission("form_factor.registrar");
    const { db, user, profile } = mockProfile();
    getMockProject(db, projectId);
    const rodada = db.rodadasFormFactor.find((item) => item.id === rodadaId && item.projeto_id === projectId);
    const execucao = db.execucoesFormFactor.find((item) => item.rodada_id === rodadaId && item.caso_teste_id === casoTesteId);
    const testCase = db.casosTeste.find((item) => item.id === casoTesteId && item.projeto_id === projectId && item.ativo);
    if (!rodada || !execucao || !testCase) throw new Error("Test Case não encontrado na rodada.");
    if (execucao.resultados_registrados) throw new Error("Os resultados deste Test Case já foram registrados na rodada.");
    const gestor = ["ADMIN_UNIDADE", "GERENTE", "KP"].includes(profile?.codigo ?? "");
    if (!gestor && testCase.responsavel_id !== user.id && testCase.backup_id !== user.id) throw new Error("Você só pode registrar resultados dos TCs atribuídos a você.");
    if (execucaoDaRodadaAtual(db, testCase.id) !== execucao) throw new Error("Este Test Case está numa rodada mais recente. Registre os resultados nela.");
    const linked = new Set(db.projetoModelos.filter((item) => item.projeto_id === projectId && item.ativo !== false).map((item) => item.modelo_dispositivo_id));
    const entries = Object.entries(input.resultados);
    if (entries.some(([modelId, value]) => !linked.has(modelId) || !["PASS", "FAIL"].includes(value))) throw new Error("Modelo ou resultado inválido.");
    entries.forEach(([modelo_dispositivo_id, resultado]) => db.formFactor.push({ execucao_id: execucao.execucao_id, caso_teste_id: testCase.id, tc_id: testCase.tc_id, responsavel_id: testCase.responsavel_id, sdf_id: rodada.sdf_id, modelo_dispositivo_id, resultado, data_reportada: execucao.data_reportada, origem: "MANUAL" }));
    const values = Object.values(input.resultados);
    // Como na API: só um TC em validação muda de Status; os resultados ficam no histórico.
    if (testCase.status === "InValidation") {
      if (values.includes("FAIL")) testCase.status = "InFixes";
      else if (linked.size > 0 && [...linked].every((modelId) => input.resultados[modelId] === "PASS")) testCase.status = "Done";
    }
    testCase.updated_at = new Date().toISOString();
    execucao.resultados_registrados = true;
    writeDb(db);
    return { execucao_id: execucao.execucao_id, caso_teste_id: testCase.id, tc_id: testCase.tc_id, responsavel_id: testCase.responsavel_id, sdf_id: rodada.sdf_id, data_reportada: execucao.data_reportada, origem: "MANUAL", resultados: input.resultados, rodada_id: rodada.id, resultados_registrados: true };
  },
  importar(projectId: string, file: File) {
    const { db, profile } = mockProfile();
    requireMockPermission("form_factor.importar");
    if (!["ADMIN_UNIDADE", "GERENTE", "KP"].includes(profile?.codigo ?? "")) throw new Error("Somente Admin, Gerente ou KP podem importar relatório SDF.");
    getMockProject(db, projectId);
    if (!file.size) throw new Error("O relatório está vazio.");
    const importId = id("mock-sdf-import");
    db.importacoesSdf.unshift({ importacao_id: importId, projeto_id: projectId, importado_em: new Date().toISOString() });
    writeDb(db);
    return { importacao_id: importId, quantidade_execucoes: 0, quantidade_resultados: 0 };
  },
};

export function resetMockDatabase() {
  localStorage.removeItem(STORAGE_KEY);
  readDb();
}
