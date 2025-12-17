"use client"

import { useTransactionHistory } from "@bobt/stellar/hooks"
import { useWallet } from "@bobt/stellar"
import type { Transaction } from "@bobt/stellar/hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  ExternalLink,
  RefreshCw,
  History,
  AlertCircle,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

function TransactionIcon({ type }: { type: Transaction["type"] }) {
  switch (type) {
    case "mint":
      return <ArrowDownRight className="h-4 w-4 text-green-500" />
    case "burn":
      return <ArrowUpRight className="h-4 w-4 text-red-500" />
    case "transfer":
      return <ArrowLeftRight className="h-4 w-4 text-blue-500" />
    default:
      return <History className="h-4 w-4 text-muted-foreground" />
  }
}

function formatAddress(address: string): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

function LoadingRows() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        </TableRow>
      ))}
    </>
  )
}

export function RecentTransactions() {
  const { isConnected, publicKey } = useWallet()
  const { transactions, isLoading, error, refetch, hasMore, loadMore } = useTransactionHistory(publicKey, 10)

  const formatTime = (createdAt: string) => {
    try {
      return formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: es })
    } catch {
      return "Unknown"
    }
  }

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            {isConnected
              ? "Your latest operations on the network"
              : "Connect wallet to see your transactions"
            }
          </CardDescription>
        </div>
        {isConnected && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
            <History className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">Connect your wallet to view transactions</p>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-destructive text-sm p-4 bg-destructive/10 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Asset</TableHead>
                  <TableHead className="hidden md:table-cell">From/To</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && transactions.length === 0 ? (
                  <LoadingRows />
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No transactions yet</p>
                      <p className="text-xs">Start trading to see your history</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TransactionIcon type={tx.type} />
                          <span className="capitalize font-medium">{tx.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {tx.amount
                          ? `${tx.type === "burn" ? "-" : "+"}${parseFloat(tx.amount).toFixed(2)}`
                          : "-"
                        }
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {tx.asset || "XLM"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-muted-foreground">
                        {formatAddress(tx.to || tx.from || "")}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatTime(tx.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Badge
                            variant="outline"
                            className={
                              tx.successful
                                ? "text-green-500 border-green-500/30"
                                : "text-red-500 border-red-500/30"
                            }
                          >
                            {tx.successful ? "confirmed" : "failed"}
                          </Badge>
                          <a
                            href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {hasMore && transactions.length > 0 && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadMore()}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
