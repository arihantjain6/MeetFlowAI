import { AlertCircleIcon } from "lucide-react";
import Image from "next/image";

interface Props {
    title: string
    description?: string;
    image?: string;
}

export const EmptyState: React.FC<Props> = ({title, description, image="/empty.svg"}: Props) => {
    return (
        <div className="flex flex-col items-center justify-between">
                <Image src={image} alt="Empty" width={240} height={240} />
                <div className="flex flex-col gap-y-6 max-w-md mx-auto text-center">
                    <h6 className="text-lg font-medium">
                        {title}
                        <p className="text-sm text-muted-foreground">
                            {description}
                        </p>
                    </h6>
                </div>
            </div> 
    )
}