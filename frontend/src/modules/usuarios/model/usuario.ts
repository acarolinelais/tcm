import { z } from "zod";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  perfil_id: string;
  responsavel_id?: string | null;
  created_at: string;
}

export const createUsuarioFormSchema = (t: (key: string) => string) => z.object({
  nome: z.string().min(1, t("nameRequired")).max(150, t("nameMax")),
  email: z.string().min(1, t("emailRequired")).email(t("invalidEmail")).max(254),
  perfil_id: z.string().optional(),
});

export type UsuarioFormValues = z.infer<ReturnType<typeof createUsuarioFormSchema>>;
