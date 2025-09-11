import { z } from "zod";

export const ZLoginSchema = z.object({
  email: z.string().email("Email inválido.").nonempty("Campo obrigatório."),
  password: z.string().nonempty("Campo obrigatório."),
});

export type TLoginSchema = z.infer<typeof ZLoginSchema>;
