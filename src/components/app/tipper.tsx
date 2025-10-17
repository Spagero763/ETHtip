"use client";

import { createBaseAccountSDK } from "@base-org/account";
import { useCallback, useEffect, useState } from "react";
import { isAddress, parseEther, type EIP1193Provider } from "viem";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { APP_NAME, APP_LOGO_URL, SUPPORTED_CHAIN, DEFAULT_TIP_AMOUNT_ETH } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, ArrowRight, CheckCircle, Info, Loader2, Send } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

// Type definitions from Base SDK examples
interface SubAccount {
  address: `0x${string}`;
}
interface GetSubAccountsResponse {
  subAccounts: SubAccount[];
}

const formSchema = z.object({
  recipient: z.string().refine((val) => isAddress(val), {
    message: "Please enter a valid Ethereum address.",
  }),
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Please enter a valid amount.",
  }),
});

type TipperFormValues = z.infer<typeof formSchema>;

export function Tipper() {
  const [provider, setProvider] = useState<EIP1193Provider | null>(null);
  const [subAccount, setSubAccount] = useState<SubAccount | null>(null);
  const [universalAddress, setUniversalAddress] = useState<`0x${string}` | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Initializing...");
  const [txHash, setTxHash] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<TipperFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipient: "0x0000000000000000000000000000000000000000" as `0x${string}`,
      amount: DEFAULT_TIP_AMOUNT_ETH,
    },
  });

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        const sdkInstance = createBaseAccountSDK({
          appName: APP_NAME,
          appLogoUrl: APP_LOGO_URL,
          appChainIds: [SUPPORTED_CHAIN.id],
          subAccounts: {
            creation: 'on-connect',
            defaultAccount: 'sub',
          }
        });
        const providerInstance = sdkInstance.getProvider() as EIP1193Provider;
        setProvider(providerInstance);
        setStatus("Ready to connect.");
      } catch (error) {
        console.error("SDK initialization failed:", error);
        setStatus("SDK initialization failed.");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not initialize wallet SDK. Please refresh the page.",
        });
      }
    };
    initializeSDK();
  }, [toast]);

  const connectWallet = async () => {
    if (!provider) return;
    setLoading(true);
    setStatus("Connecting wallet...");
    setTxHash(null);
    try {
      // Connect to the wallet - with auto sub-account creation, the sub-account will be the first account
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as `0x${string}`[];
      const universalAddr = accounts[0];
      const subAccountAddr = accounts[1]; // Sub-account is the second account when not using auto mode
      
      setUniversalAddress(universalAddr);
      setConnected(true);
      setStatus("Checking for Sub-account...");

      // Check for existing sub account
      const response = (await provider.request({
        method: "wallet_getSubAccounts",
        params: [{ account: universalAddr, domain: window.location.origin }],
      } as any)) as GetSubAccountsResponse;

      const existing = response.subAccounts[0];
      if (existing) {
        setSubAccount(existing);
        setStatus("Sub-account found. Ready to tip!");
      } else {
        setStatus("Wallet connected! Please create a Sub-account to start tipping.");
      }
    } catch (error) {
      console.error("Connection failed:", error);
      setStatus("Wallet connection failed.");
      toast({ variant: "destructive", title: "Connection Failed", description: "User rejected the connection request." });
    } finally {
      setLoading(false);
    }
  };

  const createSubAccount = async () => {
    if (!provider) return;
    setLoading(true);
    setStatus("Creating Sub-account...");
    setTxHash(null);
    try {
      const newSubAccount = (await provider.request({
        method: "wallet_addSubAccount",
        params: [{
          account: {
            type: 'create',
          },
        }],
      } as any)) as SubAccount;
      setSubAccount(newSubAccount);
      setStatus("Sub-account created successfully! You can now send tips.");
    } catch (error) {
      console.error("Sub-account creation failed:", error);
      setStatus("Sub-account creation failed.");
      toast({ variant: "destructive", title: "Creation Failed", description: "User rejected the sub-account creation." });
    } finally {
      setLoading(false);
    }
  };

  const sendTip = async (data: TipperFormValues) => {
    if (!provider || !subAccount) return;
    setLoading(true);
    setStatus("Sending tip...");
    setTxHash(null);
    try {
      const weiValue = parseEther(data.amount);
      const calls = [{
        to: data.recipient as `0x${string}`,
        value: `0x${weiValue.toString(16)}` as `0x${string}`,
        data: '0x' as const,
      }];

      const callsId = (await provider.request({
        method: "wallet_sendCalls",
        params: [{
          version: "2.0",
          atomicRequired: true,
          chainId: `0x${SUPPORTED_CHAIN.id.toString(16)}`,
          from: subAccount.address,
          calls,
          capabilities: {
            // https://docs.cdp.coinbase.com/paymaster/introduction/welcome
            // paymasterUrl: "your paymaster url",
          },
        }],
      })) as string;
      setStatus(`Tip sent successfully!`);
      setTxHash(callsId);
      form.reset();
    } catch (error: any) {
      console.error("Send tip failed:", error);
      setStatus("Tip transaction failed.");
      const errorMessage = error?.message || "The tip could not be sent. Please try again.";
      toast({ variant: "destructive", title: "Transaction Failed", description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (!connected) {
      return (
        <Button onClick={connectWallet} disabled={loading || !provider} size="lg" className="w-full">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Connect Wallet
        </Button>
      );
    }
    if (!subAccount) {
      return (
        <Button onClick={createSubAccount} disabled={loading} size="lg" className="w-full">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
          Create Sub-Account
        </Button>
      );
    }
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(sendTip)} className="space-y-6">
          <FormField
            control={form.control}
            name="recipient"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recipient Address</FormLabel>
                <FormControl>
                  <Input placeholder="0x..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (ETH)</FormLabel>
                <FormControl>
                  <Input type="number" step="any" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send Tip
          </Button>
        </form>
      </Form>
    );
  };
  
  const getStatusIcon = () => {
    if (loading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (status.includes("failed")) return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (status.includes("success") || txHash) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <Info className="h-4 w-4 text-blue-500" />;
  }

  return (
    <Card className="max-w-md mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Frictionless Tips on Base</CardTitle>
        <CardDescription>Send tips on Base Mainnet without constant wallet pop-ups.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderContent()}
      </CardContent>
      <CardFooter className="flex-col items-start space-y-4 text-xs text-muted-foreground pt-6">
        <div className="flex items-center gap-2 bg-secondary p-3 rounded-lg w-full">
          {getStatusIcon()}
          <p><strong>Status:</strong> {status}</p>
        </div>

        {universalAddress && (
          <div className="w-full truncate">
            <strong>Universal Account:</strong> {universalAddress}
          </div>
        )}
        {subAccount && (
          <div className="w-full truncate">
            <strong>Sub-Account:</strong> {subAccount.address}
          </div>
        )}
        {txHash && (
          <Alert variant="default" className="w-full bg-green-50 dark:bg-green-900/20">
             <CheckCircle className="h-4 w-4" />
            <AlertTitle>Transaction Sent!</AlertTitle>
            <AlertDescription>
              <a
                href={`${SUPPORTED_CHAIN.blockExplorers.default.url}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary"
              >
                View on {SUPPORTED_CHAIN.blockExplorers.default.name}
              </a>
            </AlertDescription>
          </Alert>
        )}
      </CardFooter>
    </Card>
  );
}
