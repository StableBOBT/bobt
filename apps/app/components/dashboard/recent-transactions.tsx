"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowDownRight, ArrowUpRight, ExternalLink } from "lucide-react"

// Sample transaction data - in production this would come from the blockchain
const transactions = [
  {
    id: "tx1",
    type: "mint",
    amount: "1,000.00",
    usdt: "143.68",
    address: "GCFL...K4XR",
    time: "2 min ago",
    status: "confirmed",
    hash: "abc123",
  },
  {
    id: "tx2",
    type: "burn",
    amount: "500.00",
    usdt: "71.84",
    address: "GBHF...9J2M",
    time: "15 min ago",
    status: "confirmed",
    hash: "def456",
  },
  {
    id: "tx3",
    type: "mint",
    amount: "2,500.00",
    usdt: "359.20",
    address: "GCDP...L8QW",
    time: "1 hour ago",
    status: "confirmed",
    hash: "ghi789",
  },
  {
    id: "tx4",
    type: "mint",
    amount: "750.00",
    usdt: "107.76",
    address: "GFKL...P3NR",
    time: "3 hours ago",
    status: "confirmed",
    hash: "jkl012",
  },
  {
    id: "tx5",
    type: "burn",
    amount: "1,200.00",
    usdt: "172.41",
    address: "GMWX...V7YT",
    time: "5 hours ago",
    status: "confirmed",
    hash: "mno345",
  },
]

export function RecentTransactions() {
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Latest mint and burn operations on the network</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="hidden sm:table-cell">USD Value</TableHead>
                <TableHead className="hidden md:table-cell">Address</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {tx.type === "mint" ? (
                        <ArrowDownRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-red-500" />
                      )}
                      <span className="capitalize font-medium">{tx.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{tx.amount} BOBT</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    ${tx.usdt}
                  </TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-muted-foreground">
                    {tx.address}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{tx.time}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Badge variant="outline" className="text-green-500 border-green-500/30">
                        {tx.status}
                      </Badge>
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
