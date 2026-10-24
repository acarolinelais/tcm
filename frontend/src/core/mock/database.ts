import type { PerfilAtual } from "@/core/auth/api";
import type { TokenResponse } from "@/core/auth/session";
import type { Perfil, Permissao } from "@/modules/perfis/api/perfis.api";
import type { Setor, SetorGerente } from "@/modules/setores/api/setores.api";
import type { Time, TimeMembro } from "@/modules/times/api/times.api";
import type { Usuario, UsuarioFormValues } from "@/modules/usuarios/model/usuario";
import type { UsuarioFiltros } from "@/modules/usuarios/api/usuario.api";
import type {
  AtualizarCasoTesteInput,
  AtualizarProjetoInput,
  CasoTeste,
  CriarCasoTesteInput,
  CriarProjetoInput,
  LinhaFormFactor,
  ModeloDispositivo,
  Projeto,
  StatusProjeto,
} from "@/modules/projetos/model/projeto";
import { lerPlanilhaProjeto } from "@/modules/projetos/utils/planilha-projeto";
import type { PagedResult } from "@/shared/types/paged-result";

const STORAGE_KEY = "sdf.mock.database.v1";
const UNIT_ID = "mock-unit-manaus";
const ADMIN_ID = "mock-user-admin";
const MANAGER_ID = "mock-user-manager";
const TEAM_ID = "mock-team-platform";

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
  projetoModelos: { projeto_id: string; modelo_dispositivo_id: string }[];
  casosTeste: CasoTeste[];
  formFactor: LinhaFormFactor[];
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
  ["form_factor.consultar", "Consultar resultados Form Factor", "form_factor", "Form Factor", 7],
  ["form_factor.importar", "Importar resultados SDF", "form_factor", "Form Factor", 7],
].map(([id, descricao, codigo, nome, ordem], index) => ({
  id: String(id), descricao: String(descricao), ordem: index + 1,
  modulo: { codigo: String(codigo), nome: String(nome), ordem: Number(ordem) },
}));

function createSeed(): Database {
  const allPermissions = permissoes.map((item) => item.id);
  const adminProfile: Perfil = { id: "mock-profile-admin", nome: "Administrador", descricao: "Acesso completo à unidade.", codigo: "ADMIN_UNIDADE", permissoes: allPermissions };
  const standardProfile: Perfil = { id: "mock-profile-standard", nome: "Developer", descricao: "Consulta projetos e TCs do time e atualiza somente os TCs atribuídos.", codigo: "USUARIO_PADRAO", permissoes: ["projetos.consultar", "test_cases.consultar"] };
  const managerProfile: Perfil = { id: "mock-profile-manager", nome: "Gerente", descricao: "Gerencia pessoas e times do setor.", codigo: "GERENTE", permissoes: ["usuarios.consultar", "usuarios.perfil.consultar", "usuarios.gerenciar", "setores.consultar", "times.consultar", "times.criar", "times.gerenciar", "projetos.consultar", "projetos.gerenciar", "test_cases.consultar", "test_cases.gerenciar"] };
  const kpProfile: Perfil = { id: "mock-profile-kp", nome: "KP", descricao: "Acompanha atividades dos times associados.", codigo: "KP", permissoes: ["usuarios.consultar", "setores.consultar", "times.consultar", "times.gerenciar", "projetos.consultar", "projetos.gerenciar", "test_cases.consultar", "test_cases.gerenciar"] };
  const sectors: Setor[] = [
    { id: "mock-sector-engineering", unidade_id: UNIT_ID, nome: "Engenharia", ativo: true },
    { id: "mock-sector-operations", unidade_id: UNIT_ID, nome: "Operações", ativo: true },
    { id: "mock-sector-archive", unidade_id: UNIT_ID, nome: "Setor inativo", ativo: false },
  ];
  const users: Usuario[] = [
    { id: ADMIN_ID, nome: "Administradora", email: "admin@sdfmanager.com", ativo: true, perfil_id: adminProfile.id, created_at: "2026-01-10T12:00:00Z" },
    { id: MANAGER_ID, nome: "Mariana Costa", email: "mariana.costa@example.com", ativo: true, perfil_id: managerProfile.id, created_at: "2026-01-12T12:00:00Z" },
    { id: "mock-user-kp", nome: "Kaique Pereira", email: "kaique.pereira@example.com", ativo: true, perfil_id: kpProfile.id, created_at: "2026-01-15T12:00:00Z" },
    { id: "mock-user-dev", nome: "Daniel Oliveira", email: "daniel.oliveira@example.com", ativo: true, perfil_id: standardProfile.id, responsavel_id: MANAGER_ID, created_at: "2026-02-01T12:00:00Z" },
    { id: "mock-user-standard", nome: "Ana Souza", email: "ana.souza@example.com", ativo: true, perfil_id: standardProfile.id, responsavel_id: MANAGER_ID, created_at: "2026-02-05T12:00:00Z" },
    { id: "mock-user-inactive", nome: "Rafael Lima", email: "rafael.lima@example.com", ativo: false, perfil_id: standardProfile.id, created_at: "2026-02-10T12:00:00Z" },
  ];
  return {
    schemaVersion: 7,
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
      { id: "mock-model-s27-ultra", unidade_id: UNIT_ID, nome: "S27 Ultra", ativo: true },
      { id: "mock-model-s26-ultra", unidade_id: UNIT_ID, nome: "S26 Ultra", ativo: true },
      { id: "mock-model-sep-lite", unidade_id: UNIT_ID, nome: "SEP Lite", ativo: true },
      { id: "mock-model-tab-s11", unidade_id: UNIT_ID, nome: "Tab S11", ativo: true },
    ],
    projetoModelos: [],
    casosTeste: [],
    formFactor: [],
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
      db.modelosDispositivo ??= [
        { id: "mock-model-s27-ultra", unidade_id: db.unidade.id, nome: "S27 Ultra", ativo: true },
        { id: "mock-model-s26-ultra", unidade_id: db.unidade.id, nome: "S26 Ultra", ativo: true },
        { id: "mock-model-sep-lite", unidade_id: db.unidade.id, nome: "SEP Lite", ativo: true },
        { id: "mock-model-tab-s11", unidade_id: db.unidade.id, nome: "Tab S11", ativo: true },
      ];
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
      const user: Usuario = { id: id("mock-user"), nome: body.nome, email: body.email, ativo: true, perfil_id: profileId, created_at: new Date().toISOString() };
      db.usuarios.unshift(user);
      return user;
    });
  },
  atualizar(userId: string, body: UsuarioFormValues) {
    return updateDb((db) => {
      const user = db.usuarios.find((item) => item.id === userId);
      if (!user) throw new Error("Usuário não encontrado.");
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
    const userTeamIds = new Set(db.membrosTime.filter((member) => member.usuario_id === user?.id && member.ativo).map((member) => member.time_id));
    const managedSectorIds = new Set(db.gerentesSetor.filter((manager) => manager.usuario_id === user?.id && manager.ativo).map((manager) => manager.setor_id));
    let teams = profile?.codigo === "ADMIN_UNIDADE" || profile?.codigo === "GERENTE"
      ? db.times.filter((team) => profile?.codigo === "ADMIN_UNIDADE" || managedSectorIds.has(team.setor_id))
      : db.times.filter((team) => userTeamIds.has(team.id));
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
      return { ...member, usuario_nome: user?.nome ?? member.usuario_nome, usuario_perfil: profile?.nome ?? member.usuario_perfil, usuario_perfil_codigo: profile?.codigo ?? member.usuario_perfil_codigo };
    });
  },
  usuariosDisponiveis() { return readDb().usuarios.filter((user) => user.ativo); },
  adicionar(teamId: string, userId: string) {
    return updateDb((db) => { let member = db.membrosTime.find((item) => item.time_id === teamId && item.usuario_id === userId); if (member) member.ativo = true; else { const user = db.usuarios.find((item) => item.id === userId); const profile = user && profileFor(db, user); member = { id: id("mock-member"), time_id: teamId, usuario_id: userId, usuario_nome: user?.nome, usuario_perfil: profile?.nome, usuario_perfil_codigo: profile?.codigo, ativo: true }; db.membrosTime.push(member); } return member; });
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

function projectInMockScope(project: Projeto) {
  const { db, user, profile } = mockProfile();
  if (profile?.codigo === "ADMIN_UNIDADE") return true;
  if (profile?.codigo === "GERENTE") {
    const sectors = new Set(db.gerentesSetor.filter((item) => item.usuario_id === user.id && item.ativo).map((item) => item.setor_id));
    return db.times.some((team) => team.id === project.time_id && sectors.has(team.setor_id));
  }
  return db.membrosTime.some((member) => member.usuario_id === user.id && member.time_id === project.time_id && member.ativo);
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
    app: input.app.trim(), one_ui: input.one_ui.trim(), nome: `${input.app.trim()} ${input.one_ui.trim()}`,
    status: "Created", ativo: true, created_at: now, updated_at: now,
  };
  db.projetos.unshift(project);
  input.modelos_ids.forEach((modelId) => db.projetoModelos.push({ projeto_id: project.id, modelo_dispositivo_id: modelId }));
  writeDb(db);
  return project;
}

function canManageMockTeam(db: Database, userId: string, profileCode: string | null | undefined, team: Time) {
  return profileCode === "ADMIN_UNIDADE"
    || (profileCode === "GERENTE" && db.gerentesSetor.some((manager) => manager.usuario_id === userId && manager.setor_id === team.setor_id && manager.ativo))
    || (profileCode === "KP" && db.membrosTime.some((member) => member.usuario_id === userId && member.time_id === team.id && member.ativo));
}

function normalizarNomeMembro(value: string) {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function normalizarEmailMembro(value: string) {
  return value.normalize("NFC").replace(/\s+/g, "").toLocaleLowerCase();
}

export const mockProjetosApi = {
  listar(pageNumber: number, pageSize: number) {
    const { profile } = mockProfile();
    if (profile?.codigo !== "ADMIN_UNIDADE" && !profile?.permissoes.includes("projetos.consultar") && !profile?.permissoes.includes("test_cases.consultar")) {
      throw new Error("Você não tem permissão para consultar projetos.");
    }
    const { db } = mockProfile();
    return page(db.projetos.filter((project) => project.ativo && projectInMockScope(project)), pageNumber, pageSize);
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
    project.app = input.app.trim();
    project.one_ui = input.one_ui.trim();
    project.nome = `${project.app} ${project.one_ui}`;
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
    const planilha = await lerPlanilhaProjeto(file);
    const { db, user, profile } = mockProfile();
    const time = db.times.find((item) => item.id === timeId && item.ativo);
    if (!time) throw new Error("Time não encontrado ou inativo.");
    if (!canManageMockTeam(db, user.id, profile?.codigo, time)) throw new Error("O time está fora do seu escopo.");
    const selectedModels = new Set(modelIds);
    const models = db.modelosDispositivo.filter((model) => selectedModels.has(model.id) && model.unidade_id === db.unidade.id && model.ativo);
    if (models.length !== selectedModels.size) throw new Error("Selecione apenas modelos de dispositivo ativos da unidade.");
    const membros = db.membrosTime.filter((member) => member.time_id === time.id && member.ativo);
    const usuarios = db.usuarios.filter((user) => user.ativo);
    const atribuidos = planilha.casos.map((caso) => {
      const resolver = (identificador: string, papel: string) => {
        const nomeInformado = normalizarNomeMembro(identificador);
        const emailInformado = normalizarEmailMembro(identificador);
        const found = usuarios.filter((user) => (normalizarNomeMembro(user.nome) === nomeInformado || normalizarEmailMembro(user.email) === emailInformado) && membros.some((member) => member.usuario_id === user.id));
        if (found.length !== 1) throw new Error(`Linha ${caso.linha}: ${papel} '${identificador}' não foi encontrado unicamente como membro ativo do time.`);
        return found[0].id;
      };
      return { caso, responsavelId: resolver(caso.responsavel, "Responsável"), backupId: resolver(caso.backup, "Backup") };
    });
    if (atribuidos.some(({ responsavelId, backupId }) => responsavelId === backupId)) {
      const line = atribuidos.find(({ responsavelId, backupId }) => responsavelId === backupId)!.caso.linha;
      throw new Error(`Linha ${line}: responsável principal e backup devem ser pessoas distintas.`);
    }
    const nomeApp = planilha.app || app?.trim() || "";
    const versao = planilha.one_ui || oneUi?.trim() || "";
    const now = new Date().toISOString();
    const projeto: Projeto = { id: id("mock-project"), unidade_id: db.unidade.id, time_id: time.id, app: nomeApp, one_ui: versao, nome: `${nomeApp} ${versao}`, status: "Created", ativo: true, created_at: now, updated_at: now };
    const casos: CasoTeste[] = atribuidos.map(({ caso, responsavelId, backupId }) => ({ id: id("mock-test-case"), unidade_id: db.unidade.id, projeto_id: projeto.id, tc_id: caso.tc_id, category: caso.category, difficulty: caso.difficulty, situation: caso.situation, responsavel_id: responsavelId, backup_id: backupId, ativo: true, created_at: now, updated_at: now }));
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
  listar(projectId: string, pageNumber: number, pageSize: number, filtros: { responsavelId?: string } = {}) {
    requireMockPermission("test_cases.consultar");
    const { db } = mockProfile();
    getMockProject(db, projectId);
    const casosDoProjeto = db.casosTeste.filter((item) => item.projeto_id === projectId && item.ativo
      && (!filtros.responsavelId || item.responsavel_id === filtros.responsavelId));
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
      category: input.category, difficulty: input.difficulty, situation: "To-Do",
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
      if (!profile?.permissoes.includes("test_cases.consultar") || testCase.responsavel_id !== user.id) {
        throw new Error("Somente o responsável principal pode editar os próprios campos do Test Case.");
      }
      const camposPermitidos = ["category", "difficulty", "situation"];
      if (Object.keys(input).some((field) => !camposPermitidos.includes(field))) throw new Error("Você só pode editar Category, Difficulty e TC Situation.");
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

export const mockModelosDispositivoApi = {
  listar(pageNumber: number, pageSize: number, active?: boolean, search?: string) {
    requireMockPermission("projetos.consultar");
    const { db } = mockProfile();
    let models = [...db.modelosDispositivo];
    if (active !== undefined) models = models.filter((model) => model.ativo === active);
    if (search) models = models.filter((model) => model.nome.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
    return page(models, pageNumber, pageSize);
  },
  criar(nome: string) {
    requireMockPermission("projetos.gerenciar");
    return updateDb((db) => {
      const normalized = nome.trim();
      if (!normalized) throw new Error("O nome do modelo é obrigatório.");
      if (db.modelosDispositivo.some((model) => model.nome.toLocaleLowerCase() === normalized.toLocaleLowerCase())) throw new Error("Já existe um modelo com esse nome.");
      const model: ModeloDispositivo = { id: id("mock-model"), unidade_id: db.unidade.id, nome: normalized, ativo: true };
      db.modelosDispositivo.unshift(model);
      return model;
    });
  },
  atualizar(modelId: string, body: { nome?: string; ativo?: boolean }) {
    requireMockPermission("projetos.gerenciar");
    return updateDb((db) => {
      const model = db.modelosDispositivo.find((item) => item.id === modelId);
      if (!model) throw new Error("Modelo de dispositivo não encontrado.");
      const name = body.nome?.trim();
      if (name && db.modelosDispositivo.some((item) => item.id !== modelId && item.nome.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error("Já existe um modelo com esse nome.");
      if (name) model.nome = name;
      if (body.ativo !== undefined) model.ativo = body.ativo;
      return model;
    });
  },
  definirAtivo(modelId: string, active: boolean) {
    return this.atualizar(modelId, { ativo: active });
  },
};

function semanaIso(value: string) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const firstThursday = new Date(date.getFullYear(), 0, 4);
  const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export const mockFormFactorApi = {
  listar(projectId: string, pageNumber: number, pageSize: number, week?: string, oneUi?: string) {
    requireMockPermission("form_factor.consultar");
    const { db } = mockProfile();
    getMockProject(db, projectId);
    let rows = db.formFactor.filter((row) => {
      const testCase = db.casosTeste.find((item) => item.projeto_id === projectId && item.tc_id === row.tc_id);
      return Boolean(testCase);
    });
    if (week) rows = rows.filter((row) => semanaIso(row.data_reportada) === week);
    if (oneUi) rows = rows.filter((row) => row.one_ui === oneUi);
    return page(rows, pageNumber, pageSize);
  },
  importar(projectId: string, file: File) {
    requireMockPermission("form_factor.importar");
    const { db } = mockProfile();
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
