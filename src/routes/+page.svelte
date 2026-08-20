

<script lang="ts">
    import { LogIn } from '@lucide/svelte';
</script>

<div class="flex flex-col min-h-dvh px-[5vw] pt-[max(3vh,env(safe-area-inset-top))] pb-[max(5vw,env(safe-area-inset-bottom))]">
    <div class="flex flex-col items-center text-center gap-[2vh] mt-[12dvh] mx-auto w-full max-w-md">
        <h1 class="font-bold text-white text-[clamp(2.5rem,12vw,4.5rem)]">SeatPls</h1>
        <p class="text-gray-100 text-[clamp(1rem,4.5vw,1.5rem)]">จองที่นั่งของคุณได้อย่างง่ายดาย</p>
    </div>

    <div class="flex-1"></div>

    <div class="flex flex-col items-center gap-[3vh] w-full max-w-md mx-auto">
    <button onclick={() => window.location.href = '/join'} class="w-full bg-white text-black border-gray-100 border-2 p-[5vw] sm:p-12 rounded-4xl drop-shadow-xl flex items-center justify-between gap-4 text-[clamp(1rem,4.5vw,1.25rem)]">
        <span class="bg-gray-100 p-[3vw] sm:p-3 flex items-center justify-center rounded-xl">
            <LogIn class="w-[6vw] h-[6vw] sm:w-6 sm:h-6" />
        </span>
        <span>เข้าร่วมห้อง</span>
    </button>

    <a href="/admin" class="text-white/80 text-[clamp(0.875rem,3.5vw,1rem)] underline underline-offset-4 active:text-white transition">
        สำหรับผู้ดูแล คลิกที่นี่
    </a>
</div>
</div>