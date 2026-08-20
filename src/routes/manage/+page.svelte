<script lang="ts">
    import { ChevronLeft, ClipboardList } from '@lucide/svelte'

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

    <div class="flex-1 flex flex-col items-center justify-center gap-[3vh] text-center w-full max-w-md mx-auto">
        <span class="bg-white/15 p-[5vw] sm:p-6 rounded-3xl text-white">
            <ClipboardList class="w-[10vw] h-[10vw] sm:w-12 sm:h-12" />
        </span>

        <div class="flex flex-col gap-[1vh]">
            <h1 class="font-bold text-white text-[clamp(1.5rem,6vw,2.5rem)]">จัดการห้อง</h1>
            <p class="text-gray-100 text-[clamp(1rem,4vw,1.25rem)]">ยังไม่มีห้องที่จัดการ</p>
        </div>
    </div>
</div>
