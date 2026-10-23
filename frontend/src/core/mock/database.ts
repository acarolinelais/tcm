import type { PerfilAtual } from "@/core/auth/api";
import type { TokenResponse } from "@/core/auth/session";
import type { Perfil, Permissao } from "@/modules/perfis/api/perfis.api";
import type { Setor, SetorGerente } from "@/modules/setores/api/setores.api";
import type { Time, TimeMembro } from "@/modules/times/api/times.api";
import type { Usuario, UsuarioFormValues } from "@/modules/usuarios/model/usuario";
import type { UsuarioFiltros } from "@/modules/usuarios/api/usuario.api";
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
].map(([id, descricao, codigo, nome, ordem], index) => ({
  id: String(id), descricao: String(descricao), ordem: index + 1,
  modulo: { codigo: String(codigo), nome: String(nome), ordem: Number(ordem) },
}));

function createSeed(): Database {
  const allPermissions = permissoes.map((item) => item.id);
  const adminProfile: Perfil = { id: "mock-profile-admin", nome: "Administrador", descricao: "Acesso completo à unidade.", codigo: "ADMIN_UNIDADE", permissoes: allPermissions };
  const standardProfile: Perfil = { id: "mock-profile-standard", nome: "Usuário padrão", descricao: "Perfil padrão da unidade.", codigo: "USUARIO_PADRAO", permissoes: ["usuarios.consultar", "setores.consultar", "times.consultar"] };
  const managerProfile: Perfil = { id: "mock-profile-manager", nome: "Gerente", descricao: "Gerencia pessoas e times do setor.", codigo: "GERENTE", permissoes: ["usuarios.consultar", "usuarios.perfil.consultar", "usuarios.gerenciar", "setores.consultar", "times.consultar", "times.criar", "times.gerenciar"] };
  const kpProfile: Perfil = { id: "mock-profile-kp", nome: "KP", descricao: "Acompanha atividades dos times associados.", codigo: "KP", permissoes: ["usuarios.consultar", "setores.consultar", "times.consultar", "times.gerenciar"] };
  const developerProfile: Perfil = { id: "mock-profile-developer", nome: "Desenvolvedor", descricao: "Perfil personalizado para demonstração.", codigo: null, permissoes: ["usuarios.consultar", "times.consultar"] };
  const sectors: Setor[] = [
    { id: "mock-sector-engineering", unidade_id: UNIT_ID, nome: "Engenharia", ativo: true },
    { id: "mock-sector-operations", unidade_id: UNIT_ID, nome: "Operações", ativo: true },
    { id: "mock-sector-archive", unidade_id: UNIT_ID, nome: "Setor inativo", ativo: false },
  ];
  const users: Usuario[] = [
    { id: ADMIN_ID, nome: "Administradora", email: "admin@sdfmanager.com", ativo: true, perfil_id: adminProfile.id, created_at: "2026-01-10T12:00:00Z" },
    { id: MANAGER_ID, nome: "Mariana Costa", email: "mariana.costa@example.com", ativo: true, perfil_id: managerProfile.id, created_at: "2026-01-12T12:00:00Z" },
    { id: "mock-user-kp", nome: "Kaique Pereira", email: "kaique.pereira@example.com", ativo: true, perfil_id: kpProfile.id, created_at: "2026-01-15T12:00:00Z" },
    { id: "mock-user-dev", nome: "Daniel Oliveira", email: "daniel.oliveira@example.com", ativo: true, perfil_id: developerProfile.id, responsavel_id: MANAGER_ID, created_at: "2026-02-01T12:00:00Z" },
    { id: "mock-user-standard", nome: "Ana Souza", email: "ana.souza@example.com", ativo: true, perfil_id: standardProfile.id, responsavel_id: MANAGER_ID, created_at: "2026-02-05T12:00:00Z" },
    { id: "mock-user-inactive", nome: "Rafael Lima", email: "rafael.lima@example.com", ativo: false, perfil_id: standardProfile.id, created_at: "2026-02-10T12:00:00Z" },
  ];
  return {
    schemaVersion: 4,
    unidade: { id: UNIT_ID, nome: "Manaus", ativo: true },
    usuarios: users,
    perfis: [adminProfile, standardProfile, managerProfile, kpProfile, developerProfile],
    permissoes,
    setores: sectors,
    gerentesSetor: [{ setor_id: sectors[0].id, usuario_id: MANAGER_ID, ativo: true }],
    times: [
      { id: TEAM_ID, setor_id: sectors[0].id, nome: "Plataforma", gerente_id: MANAGER_ID, ativo: true },
      { id: "mock-team-operations", setor_id: sectors[1].id, nome: "Suporte interno", gerente_id: null, ativo: true },
      { id: "mock-team-inactive", setor_id: sectors[1].id, nome: "Time arquivado", gerente_id: null, ativo: false },
    ],
    membrosTime: [
      { id: "mock-member-dev", time_id: TEAM_ID, usuario_id: "mock-user-dev", usuario_nome: "Daniel Oliveira", usuario_perfil: "Desenvolvedor", usuario_perfil_codigo: null, ativo: true },
      { id: "mock-member-kp", time_id: TEAM_ID, usuario_id: "mock-user-kp", usuario_nome: "Kaique Pereira", usuario_perfil: "KP", usuario_perfil_codigo: "KP", ativo: true },
      { id: "mock-member-inactive", time_id: TEAM_ID, usuario_id: "mock-user-inactive", usuario_nome: "Rafael Lima", usuario_perfil: "Usuário padrão", usuario_perfil_codigo: "USUARIO_PADRAO", ativo: false },
    ],
    idiomaPorUsuario: {},
    senhasAlteradas: [],
  };
}

function readDb(): Database {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return writeDb(createSeed());
  try {
    const db = JSON.parse(stored) as Database;
    if ((db.schemaVersion ?? 1) < 4) {
      // Align existing demo data once without overriding later permission edits.
      db.perfis.filter((profile) => profile.codigo === "KP").forEach((profile) => {
        profile.permissoes = [...new Set([...profile.permissoes, "usuarios.consultar", "setores.consultar", "times.consultar", "times.gerenciar"])];
      });
      db.schemaVersion = 4;
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
      : db.usuarios.filter((user) => user.id === currentUser?.id ||
        (profile?.codigo === "GERENTE" && user.responsavel_id === currentUser?.id) ||
        db.membrosTime.some((member) => member.usuario_id === user.id && member.ativo && currentTeamIds.has(member.time_id)));
    if (filters.nome) users = users.filter((user) => user.nome.toLocaleLowerCase().includes(filters.nome!.toLocaleLowerCase()));
    if (filters.email) users = users.filter((user) => user.email.toLocaleLowerCase().includes(filters.email!.toLocaleLowerCase()));
    if (filters.ativo !== undefined) users = users.filter((user) => user.ativo === filters.ativo);
    if (filters.perfil_id) users = users.filter((user) => user.perfil_id === filters.perfil_id);
    return page(users, pageNumber, pageSize);
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
    return page(teams, pageNumber, pageSize);
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

export function resetMockDatabase() {
  localStorage.removeItem(STORAGE_KEY);
  readDb();
}
