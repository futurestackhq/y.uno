import { Badge } from "@hackathon/ui/components/badge";
import { Button } from "@hackathon/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@hackathon/ui/components/card";
import {
  CheckCircle2,
  CircleDollarSign,
  Package,
  RotateCcw,
  ShoppingBag,
} from "lucide-react";
import { useState } from "react";

import {
  formatCurrency,
  petzCatalog,
  petzMerchant,
  petzOrders,
  YUNO_COMMISSION_BPS,
} from "./fixtures";
import type { MockOrder, MockOrderStatus } from "./types";

interface CommerceOverviewProps {
  onReset: () => void;
}

type OrderFilter = "all" | MockOrderStatus;

const orderFilterLabels: Record<OrderFilter, string> = {
  all: "All",
  failed: "Failed",
  paid: "Approved",
};

const statusLabel: Record<MockOrderStatus, string> = {
  failed: "Failed",
  paid: "Approved",
};

const isOrderFilter = (value: string): value is OrderFilter =>
  value === "all" || value === "paid" || value === "failed";

interface MetricCardProps {
  detail: string;
  icon: typeof Package;
  label: string;
  value: string;
}

const MetricCard = ({ detail, icon: Icon, label, value }: MetricCardProps) => (
  <Card>
    <CardContent className="p-5">
      <Icon className="text-primary size-5" />
      <p className="text-muted-foreground mt-4 text-sm">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-muted-foreground mt-1 text-xs">{detail}</p>
    </CardContent>
  </Card>
);

export const CommerceOverview = ({ onReset }: CommerceOverviewProps) => {
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [selectedOrder, setSelectedOrder] = useState<MockOrder | null>(null);
  const displayedOrders =
    filter === "all"
      ? petzOrders
      : petzOrders.filter((order) => order.status === filter);
  const paidOrders = petzOrders.filter((order) => order.status === "paid");
  const totalSales = paidOrders.reduce(
    (total, order) => total + order.totalCents,
    0
  );
  const commissionCents = Math.round(
    (totalSales * YUNO_COMMISSION_BPS) / 10_000
  );

  return (
    <div className="space-y-6 px-6 py-8">
      <section className="flex flex-col justify-between gap-5 border-b pb-7 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="gap-1.5" variant="secondary">
              <CheckCircle2 className="text-primary size-3.5" />
              Eligible for the marketplace
            </Badge>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Yuno Commerce for {petzMerchant.name}
          </h1>
          <p className="text-muted-foreground mt-2">
            Your Commerce Connection is active and ready to sell through
            WhatsApp.
          </p>
        </div>
        <Button onClick={onReset} type="button" variant="outline">
          <RotateCcw className="size-4" />
          Reset demo
        </Button>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          detail="available products"
          icon={Package}
          label="Published catalog"
          value={String(
            petzCatalog.filter((product) => product.published).length
          )}
        />
        <MetricCard
          detail="orders through WhatsApp"
          icon={ShoppingBag}
          label="Approved sales"
          value={String(paidOrders.length)}
        />
        <MetricCard
          detail={`${(YUNO_COMMISSION_BPS / 100).toFixed(1)}% Yuno commission`}
          icon={CircleDollarSign}
          label="Distributed revenue"
          value={formatCurrency(totalSales - commissionCents)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.65fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Published products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {petzCatalog.map((product) => (
              <div
                className="flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"
                key={product.id}
              >
                <div>
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {product.category}
                  </p>
                </div>
                <p className="text-sm font-semibold">
                  {formatCurrency(product.priceCents)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">
              Orders originating from WhatsApp
            </CardTitle>
            <div className="bg-muted flex gap-1 rounded-lg p-1">
              {Object.entries(orderFilterLabels).map(([value, label]) => (
                <Button
                  className="h-7 px-2.5 text-xs"
                  key={value}
                  onClick={() => {
                    if (isOrderFilter(value)) {
                      setFilter(value);
                    }
                  }}
                  type="button"
                  variant={filter === value ? "secondary" : "ghost"}
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="text-muted-foreground border-b text-xs">
                <tr>
                  <th className="pb-3 font-medium">Order</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Source</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {displayedOrders.map((order) => (
                  <tr className="border-b last:border-0" key={order.id}>
                    <td className="py-3 font-medium">
                      <button
                        className="text-primary underline-offset-4 hover:underline"
                        onClick={() => setSelectedOrder(order)}
                        type="button"
                      >
                        {order.id}
                      </button>
                    </td>
                    <td className="py-3">{order.customer}</td>
                    <td className="text-muted-foreground py-3">WhatsApp</td>
                    <td className="py-3">{formatCurrency(order.totalCents)}</td>
                    <td className="py-3">
                      <Badge
                        variant={
                          order.status === "paid" ? "secondary" : "destructive"
                        }
                      >
                        {statusLabel[order.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {selectedOrder ? (
              <div className="bg-muted/30 mt-5 rounded-lg border p-4 text-sm">
                <p className="font-medium">Order {selectedOrder.id}</p>
                <p className="text-muted-foreground mt-1">
                  {selectedOrder.productName} · {selectedOrder.createdAt} ·
                  WhatsApp channel
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
