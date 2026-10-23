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

export const usuarioFormSchema = z.object({
  nome: z.string().min(1, "O nome é obrigatório.").max(150, "Máximo de 150 caracteres."),
  email: z.string().min(1, "O e-mail é obrigatório.").email("E-mail inválido.").max(254),
  perfil_id: z.string().optional(),
});

export type UsuarioFormValues = z.infer<typeof usuarioFormSchema>;
