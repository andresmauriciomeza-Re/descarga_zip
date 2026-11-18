export const esComprobantePdf = (url: string): boolean =>
  url.startsWith("data:application/pdf") || /\.pdf(?:[?#]|$)/i.test(url);
