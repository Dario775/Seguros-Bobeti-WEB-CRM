import { supabaseAdmin } from "./supabase";

/**
 * Sincroniza un pago registrado en la matriz con la cuota de la póliza correspondiente.
 */
export async function syncPaymentToInstallment(clientId: string, year: number, month: number, status: string) {
    if (status !== "paid") return;

    const { data: policies } = await supabaseAdmin
        .from("policies")
        .select("id")
        .eq("client_id", clientId)
        .in("status", ["vigente", "por_vencer"]);

    if (policies && policies.length > 0) {
        const policyIds = policies.map((p: any) => p.id);

        const { data: installments } = await supabaseAdmin
            .from("policy_installments")
            .select("id, due_date")
            .in("policy_id", policyIds)
            .eq("status", "pendiente");

        const targetInstallment = installments?.find((inst: any) => {
            const d = new Date(inst.due_date);
            return (d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month);
        });

        if (targetInstallment) {
            await supabaseAdmin
                .from("policy_installments")
                .update({ status: "pagada", paid_at: new Date().toISOString() })
                .eq("id", targetInstallment.id);
        }
    }
}

/**
 * Sincroniza una cuota marcada como pagada con la matriz de cobranzas.
 */
export async function syncInstallmentToPayment(clientId: string, dueDateStr: string, amount: number) {
    const dueDate = new Date(dueDateStr);
    const year = dueDate.getUTCFullYear();
    const month = dueDate.getUTCMonth() + 1;
    const now = new Date().toISOString();

    await supabaseAdmin.from("payments").upsert({
        client_id: clientId,
        year,
        month,
        amount,
        status: "paid",
        paid_at: now,
        updated_at: now
    }, { onConflict: "client_id,year,month" });
}
