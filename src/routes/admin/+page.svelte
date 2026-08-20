<script lang="ts">
    import { ChevronLeft, Settings, SquarePen, ClipboardList } from '@lucide/svelte'

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
        <div class="flex-1 flex flex-col items-center justify-center gap-[3vh] text-center">
            <span class="bg-white/15 p-[4vw] sm:p-5 rounded-2xl text-white">
                <Settings class="w-[8vw] h-[8vw] sm:w-8 sm:h-8" />
            </span>

            <div class="flex flex-col gap-[1vh]">
                <h1 class="font-bold text-white text-[clamp(1.5rem,6vw,2.5rem)]">สำหรับผู้ดูแล</h1>
                <p class="text-gray-100 text-[clamp(1rem,4vw,1.25rem)]">จัดการห้องของคุณ</p>
            </div>
        </div>

        <div class="flex flex-col gap-[2vh] w-full">
            <a
                href="/create"
                class="w-full bg-white text-black rounded-2xl py-[4vw] sm:py-4 font-bold text-[clamp(1.125rem,4.5vw,1.375rem)] flex items-center justify-center gap-2 active:scale-[0.98] transition drop-shadow-2xl"
            >
                <SquarePen class="w-[5vw] h-[5vw] sm:w-5 sm:h-5" />
                สร้างห้อง
            </a>
            <a
                href="/manage"
                class="w-full bg-black text-white rounded-2xl py-[4vw] sm:py-4 font-bold text-[clamp(1.125rem,4.5vw,1.375rem)] flex items-center justify-center gap-2 active:scale-[0.98] transition drop-shadow-2xl"
            >
                <ClipboardList class="w-[5vw] h-[5vw] sm:w-5 sm:h-5" />
                จัดการห้อง
            </a>
        </div>
    </div>
</div>
