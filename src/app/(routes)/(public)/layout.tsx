import Navbar from "@/component/ui/Navbar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="">
        <Navbar />
        <div className="">
            {children}
        </div>
    </div>
  )
}