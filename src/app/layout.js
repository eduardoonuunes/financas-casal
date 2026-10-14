export const metadata = {
  title: 'Finanças do Casal',
  description: 'Controle financeiro pessoal',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50">{children}</body>
    </html>
  )
}
