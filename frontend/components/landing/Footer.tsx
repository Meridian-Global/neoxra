type FooterProps = {
  text: string
}

export default function Footer({ text }: FooterProps) {
  return (
    <footer className="border-t border-nxr-border py-8">
      <div className="mx-auto max-w-[1200px] px-6 text-center text-sm text-nxr-text-muted">
        {text}
      </div>
    </footer>
  )
}
