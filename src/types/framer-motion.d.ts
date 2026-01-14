// Type augmentation to fix AnimatePresence JSX compatibility with React 19
import 'framer-motion';

declare module 'framer-motion' {
  export interface AnimatePresenceProps {
    children?: React.ReactNode;
  }
}
