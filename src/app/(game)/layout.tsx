export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Game pages have their own full-screen layout without the main sidebar
  return <>{children}</>;
}
