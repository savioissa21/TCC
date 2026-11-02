import type { Transition, Variants } from "framer-motion";

export const editorialTransition: Transition = { duration: 0.42, ease: [0.22, 1, 0.36, 1] };

export const pageReveal: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: editorialTransition },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.065, delayChildren: 0.04 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: editorialTransition },
};
