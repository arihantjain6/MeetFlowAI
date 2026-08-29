"use client"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTRPC } from "@/trpc/client"
import { authClient } from "@/lib/auth-client"
import { ErrorState } from "@/components/error-state"
import { LoadingState } from "@/components/loading-state"
import { PricingCard } from "../components/pricing-card"

export const UpgradeView = () => {
    const trpc = useTRPC();

    const { data: products } = useSuspenseQuery(
        trpc.premium.getProducts.queryOptions(),
    );

    const { data: currentSubscription } = useSuspenseQuery(
        trpc.premium.getCurrentSubscription.queryOptions(),
    )
    return (
        <div className="flex-1 py-4 px-4 md:px-8 flex flex-col gap-y-10">
            <div className="flex-1 mt-4 flex flex-col gap-y-10 items-center">
                <h5 className="font-medium text-2xl md:text-3xl">
                    You are on the{" "}
                    <span className="font-semibold text-primary">
                        {currentSubscription?.name ?? "Free"}
                    </span>{" "}
                    plan
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {products.map((product) => {
                        const isCurrentProduct = currentSubscription?.id === product.id;
                        const isPremium = !!currentSubscription;

                        let buttontext = "Upgrade";
                        let onClick = () => authClient.checkout({ products: [product.id] });

                        if (isCurrentProduct) {
                            buttontext = "Manage";
                            onClick = () => authClient.customer.portal();
                        } else if (isPremium) {
                            buttontext = "Change Plan";
                            onClick = () => authClient.customer.portal();
                        }

                        return (
                            <PricingCard
                                key={product.id}
                                buttonText={buttontext}
                                onClick={onClick}
                                variant={
                                    product.metadata.variant === "highlighted" ? "highlighted" : "default"
                                }
                                title={product.name}
                                price={
                                    product.prices[0].amountType === "fixed" ? product.prices[0].priceAmount / 100 : 0
                                }
                                description={product.description}
                                priceSuffix={product.recurringInterval ?? ("recurringInterval" in product.prices[0] ? product.prices[0].recurringInterval : "") ?? ""}
                                features={product.benefits.map(
                                    benefit => benefit.description
                                )}
                                badge={product.metadata.badge as string | null}
                            />
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export const UpgradeViewLoading = () => {
    return (
        <LoadingState
            title="Loading upgrades"
            description="This may take a few seconds"
        />
    )
}

export const UpgradeViewError = () => {
    return (
        <ErrorState
            title="Failed to load meetings"
            description="Please try again later..."
        />
    )
}