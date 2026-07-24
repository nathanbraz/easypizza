# Specialized Agent Skills & Guidelines - EasyPizza (Frontend)

Este guia contém as práticas recomendadas, padrões de projeto e convenções de codificação específicas para o desenvolvimento no frontend do **EasyPizza** (React com TypeScript).

---

## 1. Diretrizes do Frontend (React + TypeScript)

Como um Desenvolvedor React sênior, priorize modularidade, tipagem estrita, performance e responsividade.

### 1.1. Arquitetura e Organização do React
* **TypeScript Estrito**: Evite o uso de `any`. Defina explicitamente tipos (`type` ou `interface`) para todas as props de componentes, estados e payloads de APIs.
* **Componentes Funcionais Modernos**: Use a declaração padrão com arrow functions e tipagem de props:
  ```tsx
  interface ButtonProps {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }
  
  export const Button = ({ label, onClick, disabled = false }: ButtonProps) => {
    return (
      <button onClick={onClick} disabled={disabled} className="btn-primary">
        {label}
      </button>
    );
  };
  ```
* **Divisão de Responsabilidades**: Separe a lógica de UI do fetch de dados. Coloque as chamadas de API em serviços ou em hooks customizados.
* **Imports Absolutos**: Configure e utilize paths com `@/` mapeando para a pasta `src/` (configurado no `vite.config.ts` e `tsconfig.json`).

### 1.2. CSS & Design
* **Design Premium e Dinâmico**: Siga o guia de estilo definido no `index.css`, utilizando variáveis de design system do projeto (`--bg-main`, `--accent-primary`, etc.). Use transições suaves (`transition: var(--transition)`), micro-animações interativas e cantos arredondados padronizados (`border-radius: var(--radius-md)`).
* **Componentes Acessíveis**: Todo input deve ter seu correspondente `<label>` e IDs únicos e descritivos para fins de testes automatizados e acessibilidade.

---

## 2. Práticas Gerais de Git & Commits
* **Commits Convencionais**:
  * `feat(ui): add customer registration validation`
  * `fix(web): correct state loading indicator alignments`
* **Trabalho Focado**: Resolva uma tarefa por vez, mantendo branches e PRs curtos e focados na issue descrita.
