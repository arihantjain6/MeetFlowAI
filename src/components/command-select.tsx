import { ReactNode, useState } from "react";
import { ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandResponsiveDialog } from "@/components/ui/command";

interface Props {
    options: Array<{
        id: string,
        value: string;
        children: ReactNode;
    }>
    value: string;
    onSelect: (value: string) => void;
    onSearch?: (value: string) => void;
    placeholder?: string;
    isSearchable?: boolean;
    className?: string;
}

export const CommandSelect = ({
    options,
    value,
    onSelect,
    onSearch,
    placeholder = "Select an option...",
    isSearchable = true,
    className,
}: Props) => {
    const [open, setOpen] = useState(false);
    const selectedOption = options.find((options) => options.value === value)

    const handleOpenChange = (open: boolean) => {
        onSearch?.("");
        setOpen(open);
    }
    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                type="button"
                variant={"outline"}
                className={cn(
                    "w-full h-9 justify-between font-normal px-3 bg-muted/50 hover:bg-muted/80",
                    !selectedOption && "text-muted-foreground",
                    className,
                )}
            >
                <div className="truncate min-w-0 flex-1 text-left">
                    {selectedOption?.children ?? placeholder}
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
            <CommandResponsiveDialog open={open} onOpenChange={handleOpenChange} showCloseButton={true}>
                {isSearchable && (
                    <CommandInput placeholder="Search..." onValueChange={onSearch} />
                )}
                <CommandList>
                    <CommandEmpty>
                        <span className="text-muted-foreground">
                            No options Found
                        </span>
                    </CommandEmpty>
                    {options.map((option) => (
                        <CommandItem
                             key={option.id}
                             onSelect={() => {
                                 onSelect(option.value)
                                 setOpen(false)
                             }}
                        > {option.children} </CommandItem>
                    ))}
                    <CommandGroup heading="">
                    </CommandGroup>
                </CommandList>
            </CommandResponsiveDialog>
        </>

    )
}