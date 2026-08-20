<script lang="ts">
    import { ChevronLeft, ShieldCheck, LockKeyhole, Plus, LoaderCircle, ClipboardList, UserRound } from '@lucide/svelte'
    import { ClientResponseError } from 'pocketbase'
    import { pb } from '$lib/config'

    interface StudentRecord {
        id: string
        student_id: string
        student_firstname: string
        student_lastname: string
        student_class: string
        student_number: string
    }

    interface Reservation {
        id: string
        user_type?: string
        display_name?: string
        user_name?: string
        expand?: {
            user_student?: StudentRecord
        }
    }

    interface Seat {
        id: string
        seat_number: string
        status: string
        locked_until?: string | null
        reservation: Reservation | null
    }

    /** The reverse-relation expand can come back as a single object or an array. */
    function toReservation(raw: Reservation | Reservation[] | undefined): Reservation | null {
        if (Array.isArray(raw)) return raw[0] ?? null
        return raw ?? null
    }

    // --- entry (admin pin) ---------------------------------------------------
    var pin = $state('')
    var pinValid = $derived(/^\d{6}$/.test(pin))

    var authed = $state(false)
    var loading = $state(false)
    var entryError = $state('')

    // --- manage view ---------------------------------------------------------
    var seats = $state<Seat[]>([])

    var newSeatNumber = $state('')
    var newSeatStatus = $state('available')
    var creating = $state(false)
    var seatError = $state('')

    const statusColor: Record<string, string> = {
        available: 'bg-green-400/20 text-green-200',
        locked: 'bg-gray-400/20 text-gray-200',
        reserved: 'bg-orange-400/20 text-orange-200',
    }

    function goBack() {
        if (history.length > 1) {
            history.back()
        } else {
            window.location.href = '/'
        }
    }

    async function loadSeats(): Promise<Seat[]> {
        const records = await pb.collection('seats').getFullList<
            Seat & { expand?: { 'reservations_via_seat'?: Reservation | Reservation[] } }
        >({
            sort: 'seat_number',
            // nested expand: seat → its reservation → the student record.
            // NOTE: both keys are required — requesting only the nested key
            // makes PocketBase return the reservation as a raw id string.
            expand: 'reservations_via_seat,reservations_via_seat.user_student',
        })
        return records.map((r) => ({
            id: r.id,
            seat_number: r.seat_number,
            status: r.status,
            locked_until: r.locked_until,
            reservation: toReservation(r.expand?.['reservations_via_seat']),
        }))
    }

    async function enter() {
        if (!pinValid || loading) return
        loading = true
        entryError = ''
        try {
            seats = await loadSeats()
            authed = true
        } catch {
            entryError = 'ไม่สามารถโหลดข้อมูลห้องได้'
        } finally {
            loading = false
        }
    }

    async function createSeat() {
        if (!newSeatNumber.trim() || creating) return
        creating = true
        seatError = ''
        try {
            const created = await pb.collection('seats').create(
                { seat_number: newSeatNumber.trim(), status: newSeatStatus },
                // the seats collection create rule requires this header
                { headers: { adminPin: pin } }
            )
            seats = [
                ...seats,
                {
                    id: created.id,
                    seat_number: created.seat_number,
                    status: created.status,
                    locked_until: null,
                    reservation: null,
                },
            ]
            newSeatNumber = ''
        } catch (err) {
            seatError =
                err instanceof ClientResponseError && err.status === 403
                    ? 'รหัสผู้ดูแลไม่ถูกต้อง'
                    : 'เพิ่มที่นั่งไม่สำเร็จ'
        } finally {
            creating = false
        }
    }
</script>

<div class="flex flex-col min-h-dvh px-[5vw] pt-[max(3vh,env(safe-area-inset-top))] pb-[max(5vw,env(safe-area-inset-bottom))]">
    <button
        onclick={goBack}
        aria-label="ย้อนกลับ"
        class="w-[10vw] h-[10vw] sm:w-12 sm:h-12 flex items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25 active:scale-95 transition"
    >
        <ChevronLeft class="w-[6vw] h-[6vw] sm:w-6 sm:h-6" />
    </button>

    {#if !authed}
        <div class="flex-1 flex flex-col w-full max-w-md mx-auto">
            <div class="flex-1 flex flex-col items-center justify-center gap-[3vh] text-center">
                <span class="bg-white/15 p-[4vw] sm:p-5 rounded-2xl text-white">
                    <ShieldCheck class="w-[8vw] h-[8vw] sm:w-8 sm:h-8" />
                </span>

                <div class="flex flex-col gap-[1vh]">
                    <h1 class="font-bold text-white text-[clamp(1.5rem,6vw,2.5rem)]">จัดการห้อง</h1>
                    <p class="text-gray-100 text-[clamp(1rem,4vw,1.25rem)]">กรอกรหัสผู้ดูแลเพื่อเข้าสู่ระบบ</p>
                </div>

                <div class="flex flex-col gap-[1vh] w-full text-left">
                    <label for="admin-pin" class="text-gray-100 text-[clamp(0.875rem,3.5vw,1rem)] font-bold">รหัสผู้ดูแล</label>
                    <div class="relative">
                        <input
                            id="admin-pin"
                            type="password"
                            inputmode="numeric"
                            autocomplete="off"
                            maxlength="6"
                            placeholder="123456"
                            value={pin}
                            oninput={(e) => { pin = e.currentTarget.value.replace(/\D/g, '').slice(0, 6) }}
                            onkeydown={(e) => { if (e.key === 'Enter') enter() }}
                            class="w-full bg-white text-black placeholder-gray-400 rounded-2xl px-[5vw] py-[4vw] sm:px-6 sm:py-4 text-[clamp(1.125rem,4.5vw,1.375rem)] text-center font-bold tracking-[0.3em] outline-none focus:ring-4 focus:ring-white/40 transition"
                        />
                        <LockKeyhole class="absolute right-[4vw] sm:right-4 top-1/2 -translate-y-1/2 w-[5vw] h-[5vw] sm:w-5 sm:h-5 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {#if entryError}
                    <p class="text-red-200 text-[clamp(0.875rem,3.5vw,1rem)]">{entryError}</p>
                {/if}
            </div>

            <button
                onclick={enter}
                disabled={!pinValid || loading}
                class="w-full bg-black text-white rounded-2xl py-[4vw] sm:py-4 font-bold text-[clamp(1.125rem,4.5vw,1.375rem)] flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-40 disabled:active:scale-100 drop-shadow-2xl"
            >
                {#if loading}
                    <LoaderCircle class="w-[5vw] h-[5vw] sm:w-5 sm:h-5 animate-spin" />
                    กำลังโหลด...
                {:else}
                    เข้าสู่ระบบ
                {/if}
            </button>
        </div>
    {:else}
        <div class="flex-1 flex flex-col w-full max-w-md mx-auto">
            <div class="flex flex-col gap-[1vh] mt-[3vh] text-center">
                <h1 class="font-bold text-white text-[clamp(1.5rem,6vw,2.5rem)]">จัดการห้อง</h1>
                <p class="text-gray-100 text-[clamp(0.875rem,3.5vw,1rem)]">
                    {seats.length} ที่นั่ง
                </p>
            </div>

            <div class="flex-1 flex flex-col gap-[2vh] mt-[3vh] overflow-y-auto">
                {#if seats.length === 0}
                    <div class="flex flex-col items-center justify-center gap-[2vh] text-center text-gray-100 py-[8vh]">
                        <ClipboardList class="w-[8vw] h-[8vw] sm:w-8 sm:h-8 opacity-70" />
                        <p class="text-[clamp(0.875rem,3.5vw,1rem)]">ยังไม่มีที่นั่ง เพิ่มที่นั่งแรกด้านล่าง</p>
                    </div>
                {:else}
                    {#each seats as seat (seat.id)}
                        <div class="w-full bg-white/15 backdrop-blur rounded-2xl p-[4vw] sm:p-5 text-white">
                            <div class="flex items-center justify-between gap-4">
                                <p class="font-bold text-[clamp(1.125rem,4.5vw,1.375rem)]">ที่นั่ง {seat.seat_number}</p>
                                <span class="shrink-0 px-[3vw] sm:px-3 py-[1.5vw] sm:py-1.5 rounded-full text-[clamp(0.75rem,3vw,0.875rem)] font-bold uppercase {statusColor[seat.status] ?? 'bg-white/15 text-white'}">
                                    {seat.status}
                                </span>
                            </div>

                            {#if seat.reservation}
                                {@const student = seat.reservation.expand?.user_student}
                                <div class="flex items-center justify-between gap-4 mt-[2vh] pt-[2vh] border-t border-white/10">
                                    <div class="flex flex-col gap-[0.5vh] text-left">
                                        {#if student}
                                            <p class="font-bold text-[clamp(0.875rem,3.5vw,1rem)]">
                                                {student.student_firstname} {student.student_lastname}
                                            </p>
                                            <p class="text-gray-100 text-[clamp(0.75rem,3vw,0.875rem)]">
                                                รหัสนักศึกษา {student.student_id}
                                            </p>
                                            <p class="text-gray-100 text-[clamp(0.75rem,3vw,0.875rem)]">
                                                ชั้น {student.student_class} · เลขที่ {student.student_number}
                                            </p>
                                        {:else}
                                            <p class="font-bold text-[clamp(0.875rem,3.5vw,1rem)]">
                                                {seat.reservation.display_name || seat.reservation.user_name || 'ผู้จอง'}
                                            </p>
                                            {#if seat.reservation.user_type}
                                                <p class="text-gray-100 text-[clamp(0.75rem,3vw,0.875rem)]">{seat.reservation.user_type}</p>
                                            {/if}
                                        {/if}
                                    </div>
                                    <span class="shrink-0 bg-white/15 rounded-full px-[3vw] sm:px-3 py-[1.5vw] sm:py-1.5 text-[clamp(0.75rem,3vw,0.875rem)] font-bold text-white flex items-center gap-1">
                                        <UserRound class="w-[3.5vw] h-[3.5vw] sm:w-3.5 sm:h-3.5" />
                                        จองแล้ว
                                    </span>
                                </div>
                            {/if}
                        </div>
                    {/each}
                {/if}
            </div>

            <div class="flex flex-col gap-[2vh] mt-[3vh]">
                {#if seatError}
                    <p class="text-red-200 text-[clamp(0.875rem,3.5vw,1rem)] text-center">{seatError}</p>
                {/if}
                <div class="flex gap-[2vw] sm:gap-3">
                    <input
                        type="text"
                        autocomplete="off"
                        placeholder="เลขที่นั่ง"
                        bind:value={newSeatNumber}
                        onkeydown={(e) => { if (e.key === 'Enter') createSeat() }}
                        class="flex-1 bg-white text-black placeholder-gray-400 rounded-2xl px-[4vw] sm:px-5 py-[3.5vw] sm:py-3.5 text-[clamp(1rem,4.5vw,1.125rem)] font-bold outline-none focus:ring-4 focus:ring-white/40 transition"
                    />
                    <select
                        bind:value={newSeatStatus}
                        class="bg-white text-black rounded-2xl px-[3vw] sm:px-4 py-[3.5vw] sm:py-3.5 text-[clamp(0.875rem,3.5vw,1rem)] font-bold outline-none focus:ring-4 focus:ring-white/40 transition"
                    >
                        <option value="available">available</option>
                        <option value="locked">locked</option>
                        <option value="reserved">reserved</option>
                    </select>
                    <button
                        onclick={createSeat}
                        disabled={!newSeatNumber.trim() || creating}
                        class="shrink-0 bg-black text-white rounded-2xl px-[5vw] sm:px-6 font-bold text-[clamp(0.875rem,3.5vw,1rem)] flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-40 disabled:active:scale-100 drop-shadow-2xl"
                    >
                        {#if creating}
                            <LoaderCircle class="w-[4vw] h-[4vw] sm:w-4 sm:h-4 animate-spin" />
                        {:else}
                            <Plus class="w-[4vw] h-[4vw] sm:w-4 sm:h-4" />
                        {/if}
                        เพิ่ม
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>
