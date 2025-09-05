import type { Meta, StoryObj } from '@storybook/react';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { markdown } from '@codemirror/lang-markdown';
import { PMCodeMirror } from './PMCodeMirror';

const meta: Meta<typeof PMCodeMirror> = {
  title: 'Form/PMCodeMirror',
  component: PMCodeMirror,
  argTypes: {
    value: { control: 'text', defaultValue: '' },
    placeholder: { control: 'text' },
    editable: { control: 'boolean', defaultValue: true },
    readOnly: { control: 'boolean', defaultValue: false },
    height: { control: 'text' },
    minHeight: { control: 'text' },
    maxHeight: { control: 'text' },
    language: {
      control: 'select',
      options: [
        'JAVASCRIPT',
        'TYPESCRIPT',
        'PYTHON',
        'GO',
        'CPP',
        'SQL',
        'HTML',
        'SCSS',
        'PHP',
        'JAVA',
        'CSHARP',
      ],
    },
  },
};
export default meta;

type Story = StoryObj<typeof PMCodeMirror>;

export const Default: Story = {
  args: {
    value: 'function hello() {\n  console.log("Hello, World!");\n}',
    placeholder: 'Type your code here...',
    height: '200px',
  },
};

export const JavaScript: Story = {
  args: {
    value:
      'const greeting = "Hello, World!";\nconsole.log(greeting);\n\nfunction add(a, b) {\n  return a + b;\n}\n\nconst result = add(5, 3);',
    extensions: [javascript({ jsx: true })],
    height: '200px',
  },
};

export const Python: Story = {
  args: {
    value:
      'def hello():\n    print("Hello, World!")\n\nclass Calculator:\n    def add(self, a, b):\n        return a + b\n\ncalc = Calculator()\nresult = calc.add(5, 3)',
    extensions: [python()],
    height: '200px',
  },
};

// New stories using the language prop
export const JavaScriptWithLanguageProp: Story = {
  args: {
    value:
      'const greeting = "Hello, World!";\nconsole.log(greeting);\n\nfunction add(a, b) {\n  return a + b;\n}\n\nconst result = add(5, 3);',
    language: 'JAVASCRIPT',
    height: '200px',
  },
};

export const TypeScriptWithLanguageProp: Story = {
  args: {
    value:
      'interface User {\n  name: string;\n  age: number;\n}\n\nconst user: User = {\n  name: "John",\n  age: 30\n};\n\nfunction greetUser(user: User): string {\n  return `Hello, ${user.name}!`;\n}',
    language: 'TYPESCRIPT',
    height: '200px',
  },
};

export const ReactJSXWithLanguageProp: Story = {
  args: {
    value:
      'import React from "react";\n\nconst MyComponent = ({ name }) => {\n  return (\n    <div>\n      <h1>Hello, {name}!</h1>\n      <button onClick={() => alert("Clicked!")}>Click me</button>\n    </div>\n  );\n};\n\nexport default MyComponent;',
    language: 'JAVASCRIPT_JSX',
    height: '200px',
  },
};

export const ReactTSXWithLanguageProp: Story = {
  args: {
    value:
      'import React from "react";\n\ninterface Props {\n  name: string;\n}\n\nconst MyComponent: React.FC<Props> = ({ name }) => {\n  return (\n    <div>\n      <h1>Hello, {name}!</h1>\n      <button onClick={() => alert("Clicked!")}>Click me</button>\n    </div>\n  );\n};\n\nexport default MyComponent;',
    language: 'TYPESCRIPT_TSX',
    height: '200px',
  },
};

export const PythonWithLanguageProp: Story = {
  args: {
    value:
      'def hello():\n    print("Hello, World!")\n\nclass Calculator:\n    def add(self, a, b):\n        return a + b\n\ncalc = Calculator()\nresult = calc.add(5, 3)\nprint(f"Result: {result}")',
    language: 'PYTHON',
    height: '200px',
  },
};

export const GoWithLanguageProp: Story = {
  args: {
    value:
      'package main\n\nimport "fmt"\n\ntype Calculator struct{}\n\nfunc (c Calculator) Add(a, b int) int {\n    return a + b\n}\n\nfunc main() {\n    calc := Calculator{}\n    result := calc.Add(5, 3)\n    fmt.Printf("Result: %d\\n", result)\n}',
    language: 'GO',
    height: '200px',
  },
};

export const CppWithLanguageProp: Story = {
  args: {
    value:
      '#include <iostream>\n#include <string>\n\nclass Calculator {\npublic:\n    int add(int a, int b) {\n        return a + b;\n    }\n};\n\nint main() {\n    Calculator calc;\n    int result = calc.add(5, 3);\n    std::cout << "Result: " << result << std::endl;\n    return 0;\n}',
    language: 'CPP',
    height: '200px',
  },
};

export const SQLWithLanguageProp: Story = {
  args: {
    value:
      "SELECT u.name, u.email, COUNT(o.id) as order_count\nFROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nWHERE u.created_at >= '2023-01-01'\nGROUP BY u.id, u.name, u.email\nHAVING COUNT(o.id) > 0\nORDER BY order_count DESC\nLIMIT 10;",
    language: 'SQL',
    height: '200px',
  },
};

export const Markdown: Story = {
  args: {
    value:
      '# Hello World\n\nThis is a **markdown** editor with *syntax highlighting*.\n\n- List item 1\n- List item 2\n- List item 3\n\n```javascript\nconst example = "code block";\n```',
    extensions: [markdown()],
    height: '200px',
  },
};

export const ReadOnly: Story = {
  args: {
    value: 'This code editor is read-only.\nYou cannot edit this content.',
    readOnly: true,
    height: '150px',
  },
};

export const WithPlaceholder: Story = {
  args: {
    value: '',
    placeholder: 'Start typing your code here...',
    height: '150px',
  },
};

export const DraculaDefault: Story = {
  args: {
    value:
      'function draculaTheme() {\n  console.log("Welcome to the dark side!");\n  const vampire = {\n    name: "Dracula",\n    power: "immortality",\n    weakness: "sunlight"\n  };\n  return vampire;\n}',
    extensions: [javascript({ jsx: true })],
    height: '200px',
  },
};

export const MinimalSetup: Story = {
  args: {
    value: 'console.log("Minimal setup");',
    basicSetup: {
      lineNumbers: false,
      foldGutter: false,
      searchKeymap: false,
    },
    height: '100px',
  },
};
