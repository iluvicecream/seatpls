<script lang="ts">
    import { page } from '$app/stores'
    import { onMount, onDestroy } from 'svelte'
    import { ChevronLeft, UserRound, LoaderCircle, LogOut, Check, X } from '@lucide/svelte'
    import { pb } from '$lib/config'

    const name = $page.url.searchParams.get('name') ?? ''
    const studentId = $page.url.searchParams.get('student_id') ?? ''
    const studentName = $page.url.searchParams.get('student_name') ?? ''

    interface SeatInfo {
        id: string
        seat_number: string
        status: string
        locked_until?: string | null
    }

    interface Reservation {
        id: string
        user_type?: string
        display_name?: string
        user_name?: string
        seat?: string
    }

    var liveSeats = $state<SeatInfo[]>([])
    var reservationsBySeat = $state<Record<string, Reservation>>({})
    var loading = $state(true)
    var error = $state('')
    var unsubscribeSeats = $state<(() => Promise<void>) | null>(null)
    var unsubscribeReservations = $state<(() => Promise<void>) | null>(null)

    // hold + reserve
    var selectedSeat = $state<SeatInfo | null>(null)
    var myReservation = $state<Reservation | null>(null)
    var reserving = $state(false)
    var reserveError = $state('')
    var statusError = $state('')

    const identity = studentName || name || studentId
    const reservedCount = $derived(Object.keys(reservationsBySeat).length)
    const mySeatId = $derived(myReservation?.seat ?? null)
    const mySeatNumber = $derived(
        mySeatId ? liveSeats.find((s) => s.id === mySeatId)?.seat_number ?? null : null
    )

    function sortSeats(a: SeatInfo, b: SeatInfo) {
        const na = Number(a.seat_number)
        const nb = Number(b.seat_number)
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
        return a.seat_number.localeCompare(b.seat_number)
    }

    // --- 7x13 seat grid ------------------------------------------------------
    const GRID_ROWS = 7
    const GRID_COLS = 13

    /** Places seats on a 7×13 grid by parsing seat numbers like "A1" (row letter + col number). */
    const seatGrid = $derived.by(() => {
        const cells: (SeatInfo | null)[][] = Array.from({ length: GRID_ROWS }, () =>
            Array(GRID_COLS).fill(null)
        )
        const unplaced: SeatInfo[] = []
        for (const seat of liveSeats) {
            const m = /^([A-Za-z])(\d+)$/.exec(seat.seat_number.trim())
            if (m) {
                const row = m[1].toUpperCase().charCodeAt(0) - 65 // A=0
                const col = Number(m[2]) - 1
                if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS && !cells[row][col]) {
                    cells[row][col] = seat
                    continue
                }
            }
            unplaced.push(seat)
        }
        // seats without a parseable position fill the remaining empty cells in order
        let u = 0
        outer: for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                if (u >= unplaced.length) break outer
                if (!cells[r][c]) cells[r][c] = unplaced[u++]
            }
        }
        return cells
    })

    function seatClass(seat: SeatInfo | null) {
        if (!seat) return 'bg-white/5'
        if (seat.id === myReservation?.seat) return 'bg-green-400/50 text-white'
        if (reservationsBySeat[seat.id]) return 'bg-red-500/50 text-white/90'
        if (seat.status === 'locked') return 'bg-gray-400/30 text-white/70'
        return 'bg-white/20 text-white hover:bg-white/30 active:scale-95'
    }

    function attachReservation(record: Reservation) {
        if (!record.seat) return
        reservationsBySeat = { ...reservationsBySeat, [record.seat]: record }
    }

    function detachReservation(record: Reservation) {
        if (!record.seat) return
        const next = { ...reservationsBySeat }
        delete next[record.seat]
        reservationsBySeat = next
    }

    /** Does this user already hold a reservation? (one per user) */
    function findMyReservation(reservations: Reservation[]): Reservation | null {
        if (studentId) {
            return reservations.find((r) => r.user_name === studentId) ?? null
        }
        if (name) {
            return reservations.find((r) => r.display_name === name) ?? null
        }
        return null
    }

    async function reserveSeat() {
        if (!selectedSeat || reserving || myReservation) return
        reserving = true
        reserveError = ''
        statusError = ''
        try {
            let payload: Record<string, unknown> = {
                seat: selectedSeat.id,
                user_type: 'name',
                display_name: name,
            }
            if (studentId) {
                const student = await pb
                    .collection('student')
                    .getFirstListItem<{ id: string; student_firstname: string; student_lastname: string }>(
                        `student_id = "${studentId}"`
                    )
                payload = {
                    seat: selectedSeat.id,
                    user_type: 'student_id',
                    display_name: studentName || `${student.student_firstname} ${student.student_lastname}`,
                    user_name: studentId,
                    user_student: student.id,
                }
            }
            const created = await pb.collection('reservations').create<Reservation>(payload)
            attachReservation(created)
            myReservation = created
            selectedSeat = null

            // after reserve: mark the seat as reserved
            try {
                await pb.collection('seats').update(created.seat!, { status: 'reserved' })
                liveSeats = liveSeats.map((s) =>
                    s.id === created.seat ? { ...s, status: 'reserved' } : s
                )
            } catch {
                statusError = 'จองแล้ว แต่ไม่สามารถอัปเดตสถานะที่นั่งได้'
            }
        } catch {
            reserveError = 'จองที่นั่งไม่สำเร็จ'
        } finally {
            reserving = false
        }
    }

    function cancelHold() {
        selectedSeat = null
        reserveError = ''
    }

    onMount(async () => {
        try {
            // initial snapshot: seats + reservations
            const [seats, reservations] = await Promise.all([
                pb.collection('seats').getFullList<SeatInfo>({ sort: 'seat_number' }),
                pb.collection('reservations').getFullList<Reservation>({}),
            ])
            liveSeats = seats
            reservationsBySeat = Object.fromEntries(
                reservations.filter((r) => r.seat).map((r) => [r.seat as string, r])
            )
            myReservation = findMyReservation(reservations)

            // realtime: seats ('*' = subscribe to all records — 'true' does NOT deliver events)
            unsubscribeSeats = await pb.collection('seats').subscribe<SeatInfo>('*', (e) => {
                if (e.action === 'create') {
                    liveSeats = [...liveSeats, e.record].sort(sortSeats)
                } else if (e.action === 'update') {
                    liveSeats = liveSeats.map((s) => (s.id === e.record.id ? e.record : s))
                } else if (e.action === 'delete') {
                    liveSeats = liveSeats.filter((s) => s.id !== e.record.id)
                    const next = { ...reservationsBySeat }
                    delete next[e.record.id]
                    reservationsBySeat = next
                }
            })

            // realtime: reservations ('*' = subscribe to all records)
            unsubscribeReservations = await pb
                .collection('reservations')
                .subscribe<Reservation>('*', (e) => {
                    if (e.action === 'create' || e.action === 'update') {
                        attachReservation(e.record)
                        if (e.action === 'create' && findMyReservation([e.record])) {
                            myReservation = e.record
                        }
                    } else if (e.action === 'delete') {
                        detachReservation(e.record)
                        if (myReservation?.id === e.record.id) {
                            myReservation = null
                        }
                    }
                })
        } catch {
            error = 'ไม่สามารถเชื่อมต่อห้องได้'
        } finally {
            loading = false
        }
    })

    onDestroy(() => {
        unsubscribeSeats?.()
        unsubscribeReservations?.()
    })

    function goBack() {
        if (history.length > 1) {
            history.back()
        } else {
            window.location.href = '/'
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

    <div class="flex-1 flex flex-col w-full max-w-md mx-auto">
        <div class="flex flex-col items-center gap-[1vh] mt-[3vh] text-center">
            <h1 class="font-bold text-white text-[clamp(1.5rem,6vw,2.5rem)]">เลือกที่นั่ง</h1>
            <p class="text-gray-100 text-[clamp(0.875rem,3.5vw,1rem)]">
                อัปเดตแบบเรียลไทม์ · {liveSeats.length} ที่นั่ง · {reservedCount} จอง
            </p>
            {#if identity}
                <div class="flex items-center justify-center gap-2 bg-white/15 rounded-full px-[4vw] sm:px-4 py-[1.5vw] sm:py-1.5 text-white text-[clamp(0.875rem,3.5vw,1rem)] font-bold">
                    <UserRound class="w-[4vw] h-[4vw] sm:w-4 sm:h-4" />
                    {identity}
                </div>
            {/if}
            {#if mySeatNumber}
                <div class="flex items-center justify-center gap-2 bg-green-400/20 rounded-full px-[4vw] sm:px-4 py-[1.5vw] sm:py-1.5 text-green-200 text-[clamp(0.875rem,3.5vw,1rem)] font-bold">
                    <Check class="w-[4vw] h-[4vw] sm:w-4 sm:h-4" />
                    คุณได้จองที่นั่ง {mySeatNumber} แล้ว
                </div>
            {/if}
            {#if statusError}
                <p class="text-yellow-200 text-[clamp(0.75rem,3vw,0.875rem)]">{statusError}</p>
            {/if}
        </div>

        <div class="flex-1 flex flex-col gap-[2vh] mt-[3vh] overflow-y-auto">
            {#if loading}
                <div class="flex flex-col items-center justify-center gap-[2vh] text-center text-gray-100 py-[8vh]">
                    <LoaderCircle class="w-[8vw] h-[8vw] sm:w-8 sm:h-8 animate-spin opacity-70" />
                    <p class="text-[clamp(0.875rem,3.5vw,1rem)]">กำลังโหลดที่นั่ง...</p>
                </div>
            {:else if error}
                <div class="flex flex-col items-center justify-center gap-[2vh] text-center text-red-200 py-[8vh]">
                    <p class="text-[clamp(0.875rem,3.5vw,1rem)]">{error}</p>
                </div>
            {:else if liveSeats.length === 0}
                <div class="flex flex-col items-center justify-center gap-[2vh] text-center text-gray-100 py-[8vh]">
                    <p class="text-[clamp(0.875rem,3.5vw,1rem)]">ยังไม่มีที่นั่งในห้องนี้</p>
                </div>
            {:else}
                <div class="grid gap-[1.5vw] sm:gap-1.5" style="grid-template-columns: repeat(13, minmax(0, 1fr))">
                    {#each Array.from({ length: GRID_ROWS }, (_, i) => GRID_ROWS - 1 - i) as r}
                        {@const row = seatGrid[r]}
                        {#each row as seat, c}
                            {#if seat}
                                {@const reservation = reservationsBySeat[seat.id]}
                                <button
                                    onclick={() => { if (!reservation && !myReservation) selectedSeat = seat }}
                                    disabled={!!reservation || !!myReservation}
                                    aria-label={`ที่นั่ง ${seat.seat_number}`}
                                    class="aspect-square rounded-lg sm:rounded-xl flex flex-col items-center justify-center gap-px transition {seatClass(seat)}"
                                >
                                    <span class="font-bold text-[8px] sm:text-[11px] leading-tight">{seat.seat_number}</span>
                                    {#if reservation}
                                        <span class="text-[6px] sm:text-[8px] opacity-90 leading-tight">{reservation.user_name || 'จอง'}</span>
                                    {:else if seat.status === 'locked'}
                                        <span class="text-[6px] sm:text-[8px] opacity-90 leading-tight">ล็อก</span>
                                    {:else}
                                        <span class="text-[6px] sm:text-[8px] opacity-80 leading-tight">ว่าง</span>
                                    {/if}
                                </button>
                            {:else}
                                <div class="aspect-square rounded-lg sm:rounded-xl bg-white/5"></div>
                            {/if}
                        {/each}
                    {/each}
                </div>
            {/if}
        </div>

        {#if selectedSeat}
            <div class="mt-[3vh] w-full bg-white rounded-2xl p-[4vw] sm:p-5 text-black drop-shadow-2xl">
                <p class="font-bold text-[clamp(1.125rem,4.5vw,1.375rem)] text-center">จองที่นั่ง {selectedSeat.seat_number}?</p>
                {#if reserveError}
                    <p class="text-red-600 text-[clamp(0.875rem,3.5vw,1rem)] text-center mt-[1vh]">{reserveError}</p>
                {/if}
                <div class="flex gap-[2vw] sm:gap-3 mt-[2vh]">
                    <button
                        onclick={cancelHold}
                        disabled={reserving}
                        class="flex-1 bg-gray-100 text-black rounded-2xl py-[3.5vw] sm:py-3.5 font-bold text-[clamp(0.875rem,3.5vw,1rem)] flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-40"
                    >
                        <X class="w-[4vw] h-[4vw] sm:w-4 sm:h-4" />
                        ยกเลิก
                    </button>
                    <button
                        onclick={reserveSeat}
                        disabled={reserving}
                        class="flex-1 bg-black text-white rounded-2xl py-[3.5vw] sm:py-3.5 font-bold text-[clamp(0.875rem,3.5vw,1rem)] flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-40"
                    >
                        {#if reserving}
                            <LoaderCircle class="w-[4vw] h-[4vw] sm:w-4 sm:h-4 animate-spin" />
                            กำลังจอง...
                        {:else}
                            <Check class="w-[4vw] h-[4vw] sm:w-4 sm:h-4" />
                            ยืนยันการจอง
                        {/if}
                    </button>
                </div>
            </div>
        {:else}
            <button
                onclick={() => { window.location.href = '/' }}
                class="w-full bg-black text-white rounded-2xl py-[4vw] sm:py-4 font-bold text-[clamp(1.125rem,4.5vw,1.375rem)] flex items-center justify-center gap-2 active:scale-[0.98] transition drop-shadow-2xl mt-[3vh]"
            >
                <LogOut class="w-[5vw] h-[5vw] sm:w-5 sm:h-5" />
                ออกจากห้อง
            </button>
        {/if}
    </div>
</div>
