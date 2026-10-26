import "@fontsource-variable/fredoka/wght.css";
import "@fontsource-variable/lexend/wght.css";
import "./globals.css";

export const metadata = {
  title: "Alumno Cero — aprende enseñándole a Cero",
  description: "Explícale un tema a Cero, que solo sabe lo que tú le enseñas. Si se equivoca en un problema nuevo, te muestra qué frase tuya lo confundió.",
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fff8e8",
  colorScheme: "light",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <a className="skip" href="#main">Saltar al contenido</a>
        {children}
      </body>
    </html>
  );
}
