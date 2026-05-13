/**
 * Shared assistant-message markdown surface (ChatGPT / Gemini-like: clear hierarchy,
 * comfortable line length, readable tables and quotes). Use on any ReactMarkdown wrapper.
 */
export const ASSISTANT_MARKDOWN_CLASS =
  'prose prose-neutral dark:prose-invert max-w-none text-[15px] leading-7 ' +
  'prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-gray-900 dark:prose-headings:text-gray-50 ' +
  'prose-h1:text-xl prose-h1:mt-6 prose-h1:mb-3 prose-h2:text-lg prose-h2:mt-5 prose-h2:mb-2 prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2 ' +
  'prose-p:text-[15px] prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-p:leading-7 prose-p:my-3 ' +
  'prose-li:text-[15px] prose-li:text-gray-800 dark:prose-li:text-gray-200 prose-li:my-1 prose-li:leading-7 ' +
  'prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-semibold ' +
  'prose-a:text-gpai-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline ' +
  'prose-code:text-[13px] prose-code:font-normal prose-code:text-rose-700 dark:prose-code:text-rose-300 ' +
  'prose-code:bg-gray-100 dark:prose-code:bg-gray-800/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md ' +
  'prose-code:before:content-none prose-code:after:content-none ' +
  'prose-pre:bg-[#0d1117] prose-pre:text-gray-100 prose-pre:rounded-xl prose-pre:text-[13px] prose-pre:leading-relaxed prose-pre:my-4 prose-pre:border prose-pre:border-gray-800 ' +
  'prose-ul:my-3 prose-ol:my-3 prose-ul:pl-1 prose-ol:pl-1 ' +
  'prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600 ' +
  'prose-blockquote:pl-4 prose-blockquote:text-gray-700 dark:prose-blockquote:text-gray-300 prose-blockquote:font-normal ' +
  'prose-hr:border-gray-200 dark:prose-hr:border-gpai-border prose-hr:my-6 ' +
  'prose-table:text-[14px] prose-table:border-collapse prose-table:my-4 ' +
  'prose-th:border prose-th:border-gray-200 dark:prose-th:border-gpai-border prose-th:bg-gray-50 dark:prose-th:bg-gpai-surface-2 prose-th:px-3 prose-th:py-2 prose-th:font-semibold ' +
  'prose-td:border prose-td:border-gray-200 dark:prose-td:border-gpai-border prose-td:px-3 prose-td:py-2 ' +
  '[&_.katex]:text-[1em] [&_td_.katex]:text-[0.95em] [&_.katex-display]:my-4';

/** Compact markdown for key-point lines */
export const KEY_POINT_MARKDOWN_CLASS =
  'prose prose-sm prose-neutral dark:prose-invert max-w-none text-[13px] leading-relaxed ' +
  '[&_p]:m-0 [&_p]:text-gray-700 dark:[&_p]:text-gray-200 ' +
  'prose-code:text-xs prose-code:px-1 prose-code:py-0.5 [&_.katex]:text-[0.95em]';
