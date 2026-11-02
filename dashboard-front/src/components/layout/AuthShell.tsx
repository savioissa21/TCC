import type { ReactNode } from "react";
import { MessageSquareText, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { pageReveal, staggerContainer, staggerItem } from "../../lib/motion";
import { EditorialLabel, Surface } from "../ui/editorial";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

const benefits = [
  { icon: MessageSquareText, title: "Avaliações organizadas", text: "Comentários e aspectos reunidos em uma leitura clara." },
  { icon: TrendingUp, title: "Evolução acompanhada", text: "Indicadores que mostram o que melhorou e o que pede atenção." },
  { icon: ShieldCheck, title: "Decisões com contexto", text: "Amostra, fonte e atualização sempre visíveis." },
];

export function AuthShell({ eyebrow, title, description, children, footer }: AuthShellProps) {
  return (
    <main className="app-canvas relative grid min-h-screen overflow-hidden lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative z-10 hidden min-h-screen overflow-hidden bg-ink px-10 py-10 text-surface lg:flex lg:flex-col xl:px-16 xl:py-14">
        <div className="absolute -left-32 top-1/4 h-80 w-80 rounded-full bg-evergreen/25 blur-3xl" aria-hidden="true" />
        <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-[#a8e6c3]/10 blur-3xl" aria-hidden="true" />

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 -rotate-6 items-center justify-center rounded-xl bg-[#a8e6c3] text-ink shadow-lg">
            <Sparkles size={20} aria-hidden="true" />
          </span>
          <div>
            <span className="block text-xl font-black tracking-[0.14em]">NEXO</span>
            <span className="block text-[0.62rem] font-bold uppercase tracking-[0.18em] text-white/40">Inteligência da experiência</span>
          </div>
        </div>

        <motion.div className="relative my-auto max-w-xl" initial="hidden" animate="visible" variants={staggerContainer}>
          <motion.p variants={staggerItem} className="text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-[#a8e6c3]">A voz do cliente, em perspectiva</motion.p>
          <motion.h2 variants={staggerItem} className="mt-5 text-5xl font-black leading-[0.98] tracking-[-0.055em] xl:text-6xl">
            Entenda a experiência antes da próxima decisão.
          </motion.h2>
          <motion.p variants={staggerItem} className="mt-6 max-w-lg text-base leading-7 text-white/58">
            O NEXO transforma avaliações públicas em sinais objetivos sobre atendimento, ambiente, comida e preço.
          </motion.p>
          <motion.div variants={staggerContainer} className="mt-10 grid gap-3">
            {benefits.map(({ icon: Icon, title: itemTitle, text }) => (
              <motion.div key={itemTitle} variants={staggerItem} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/8 text-[#a8e6c3]"><Icon size={17} aria-hidden="true" /></span>
                <div><p className="text-sm font-bold text-white">{itemTitle}</p><p className="mt-1 text-xs leading-relaxed text-white/45">{text}</p></div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        <p className="relative text-[0.65rem] uppercase tracking-[0.16em] text-white/28">Projeto de análise de sentimentos baseada em aspectos</p>
      </section>

      <section className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
        <motion.div className="w-full max-w-lg" initial="hidden" animate="visible" variants={pageReveal}>
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 -rotate-6 items-center justify-center rounded-xl bg-ink text-[#a8e6c3]"><Sparkles size={16} aria-hidden="true" /></span>
            <span className="font-black tracking-[0.13em] text-ink">NEXO</span>
          </div>
          <Surface className="p-6 sm:p-9">
            <EditorialLabel>{eyebrow}</EditorialLabel>
            <h1 className="mt-4 text-3xl font-black tracking-[-0.045em] text-ink sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
            <div className="mt-8">{children}</div>
          </Surface>
          <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
        </motion.div>
      </section>
    </main>
  );
}
