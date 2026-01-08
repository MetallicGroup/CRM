import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Employee, Partner, PartnerMonthlyData } from "@/lib/types";

export function useEmployees() {
    return useQuery<Employee[]>({
        queryKey: ["/api/employees"],
    });
}

export function useEmployee(id: string) {
    return useQuery<Employee>({
        queryKey: [`/api/employees/${id}`],
    });
}

export function useCreateEmployee() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/employees", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
        },
    });
}

export function useUpdateEmployee() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const res = await apiRequest("PATCH", `/api/employees/${id}`, data);
            return res.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
            queryClient.invalidateQueries({ queryKey: [`/api/employees/${variables.id}`] });
        },
    });
}

export function useDeleteEmployee() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/employees/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
        },
    });
}

export function useDistributors() {
    return useQuery<Partner[]>({
        queryKey: ["/api/partners", { tipPartener: "DISTRIBUITOR" }],
        queryFn: async () => {
            const res = await fetch("/api/partners?tipPartener=DISTRIBUITOR");
            if (!res.ok) throw new Error("Failed to fetch distributors");
            return res.json();
        }
    });
}

export function useDistributorMonthlyData(partnerId?: string, luna?: number, an?: number) {
    return useQuery<PartnerMonthlyData[]>({
        queryKey: ["/api/distributors/monthly", { partnerId, luna, an }],
        queryFn: async ({ queryKey }) => {
            const [_url, params]: [string, any] = queryKey as any;
            const searchParams = new URLSearchParams();
            if (params.partnerId) searchParams.append("partnerId", params.partnerId);
            if (params.luna) searchParams.append("luna", params.luna.toString());
            if (params.an) searchParams.append("an", params.an.toString());

            const res = await fetch(`/api/distributors/monthly?${searchParams.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch monthly data");
            return res.json();
        }
    });
}

export function useUpsertDistributorMonthly() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/distributors/monthly", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/distributors/monthly"] });
        },
    });
}

export function useFinancialReport(luna: number, an: number, endLuna?: number) {
    return useQuery<any>({
        queryKey: ["/api/financial/report", { luna, an, endLuna }],
        queryFn: async ({ queryKey }) => {
            const [_url, params]: [string, any] = queryKey as any;
            const searchParams = new URLSearchParams();
            searchParams.append("luna", params.luna.toString());
            searchParams.append("an", params.an.toString());
            if (params.endLuna) searchParams.append("endLuna", params.endLuna.toString());

            const res = await fetch(`/api/financial/report?${searchParams.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch financial report");
            return res.json();
        }
    });
}
