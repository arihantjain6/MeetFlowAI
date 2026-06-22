interface Props {
    children: React.ReactNode
}

const Layout = ({children}:Props) => {
    return(
        <div className="bg-muted flex flex-col items-center justify-center min-h-svh pd-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-3xl">
                {children}
            </div>
        </div>
    )
}

export default Layout;