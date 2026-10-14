import './globals.css'

export const metadata = {
  title: 'Finanças do Casal',
  description: 'Controle financeiro pessoal',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50 text-gray-800 antialiased">{children}</body>
    </html>
  )
}
