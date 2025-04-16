import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    useConnection,
    defaultConnection,
} from "@/contexts/connection-context";
import { apiService } from "@/services/api";

const formSchema = z.object({
    host: z.string().min(1, { message: "Host is required" }),
    port: z.coerce
        .number()
        .int()
        .positive({ message: "Port must be a positive number" }),
    database: z.string().min(1, { message: "Database is required" }),
    username: z.string().min(1, { message: "Username is required" }),
    password: z.string().optional(),
    jwtToken: z.string().optional(),
    protocol: z.enum(["http", "https"]),
});

type FormValues = z.infer<typeof formSchema>;

export function ConnectionForm() {
    const { setConnection, setIsConnected, setTables } = useConnection();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: defaultConnection,
    });

    const onSubmit = async (values: FormValues) => {
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const validationResult = await apiService.checkConnection(values);

            if (validationResult.success) {
                setConnection(values);
                setIsConnected(true);
                setSuccess(true);

                // Fetch tables for the connection
                const tables = await apiService.getTables(values);
                setTables(tables);
            } else {
                setError(validationResult.error || "Connection failed");
            }
        } catch (err) {
            console.log(err);
            setError(
                err instanceof Error
                    ? (err as any)?.response?.data?.error || err.message
                    : "An unknown error occurred"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardContent className="pt-6">
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="protocol"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Protocol</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select protocol" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="http">
                                                    HTTP
                                                </SelectItem>
                                                <SelectItem value="https">
                                                    HTTPS
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="host"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Host</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="localhost"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="port"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Port</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="8123"
                                                {...field}
                                                onChange={(e) =>
                                                    field.onChange(
                                                        parseInt(e.target.value)
                                                    )
                                                }
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="database"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Database</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="default"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Username</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="default"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="Password"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Leave empty if using JWT token
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="jwtToken"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>JWT Token</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="JWT Token"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Optional. Used for secure
                                            connections.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {success && (
                            <Alert className="border-green-500">
                                <AlertDescription className="text-green-500">
                                    Connection successful!
                                </AlertDescription>
                            </Alert>
                        )}

                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                "Test Connection"
                            )}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
