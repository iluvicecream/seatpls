<script lang="ts">
    import { page } from '$app/stores'
    import { onMount } from 'svelte'
    import { ChevronLeft, TriangleAlert, KeyRound, UserRound, Fingerprint, LoaderCircle, LogIn } from '@lucide/svelte'
    import { config, pb } from '$lib/config'

    // ?stage={} || enter_code , enter_name
    var stage = $page.url.searchParams.get('stage') || 'enter_code'

    var code = $state($page.url.searchParams.get('code') || '')
    var name = $state($page.url.searchParams.get('name') || '')
    var studentId = $state($page.url.searchParams.get('student_id') || '')

    // Which identity field the room wants: name or student_id (5 digits).
    // Comes from the `config` collection key `name_type`.
    var nameType = $state<'name' | 'student_id'>('name')
    var configLoaded = $state(false)

    const nameValid = $derived(name.trim().length > 0)
    const idValid = $derived(/^\d{5}$/.test(studentId))

    interface StudentInfo {
        student_id: string
        student_firstname: string
        student_lastname: string
        student_class: string
        student_number: string
    }

    var studentInfo = $state<StudentInfo | null>(null)
    var infoLoading = $state(false)
    var infoError = $state('')

    async function fetchInfo(id: string) {
        infoLoading = true
        infoError = ''
        try {
            const res = await fetch(`/student_id/get_info?student_id=${encodeURIComponent(id)}`)
            const data = (await res.json()) as StudentInfo & { error?: string }
            if (!res.ok) throw new Error(data.error ?? 'fetch failed')
            studentInfo = data
        } catch {
            studentInfo = null
            infoError = 'ไม่พบข้อมูลนักเรียน'
        } finally {
            infoLoading = false
        }
    }

    // Query user info once a full 5-digit ID has been typed.
    $effect(() => {
        if (idValid) {
            fetchInfo(studentId)
        } else {
            studentInfo = null
            infoError = ''
        }
    })

    onMount(async () => {
        const value = await config.getValue('name_type', 'name')
        nameType = value === 'student_id' ? 'student_id' : 'name'
        configLoaded = true
    })

    function goBack() {
        if (history.length > 1) {
            history.back()
        } else {
            window.location.href = '/'
        }
    }

    function nextStage() {
        window.location.href = `/join?stage=enter_name`
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

    {#if stage === 'enter_code'}
        <div class="flex-1 flex flex-col w-full max-w-md mx-auto">
            <div class="flex-1 flex flex-col items-center justify-center gap-[3vh] text-center">
                <span class="bg-white/15 p-[4vw] sm:p-5 rounded-2xl text-white">
                    <KeyRound class="w-[8vw] h-[8vw] sm:w-8 sm:h-8" />
                </span>

                <div class="flex flex-col gap-[1vh]">
                    <h1 class="font-bold text-white text-[clamp(1.5rem,6vw,2.5rem)]">เข้าร่วมห้อง</h1>
                    <p class="text-gray-100 text-[clamp(1rem,4vw,1.25rem)]">กรอกรหัสห้องเพื่อเข้าร่วม</p>
                </div>

                <input
                    type="text"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    placeholder="รหัสห้อง"
                    bind:value={code}
                    class="w-full bg-white text-black placeholder-gray-400 rounded-2xl px-[5vw] py-[4vw] sm:px-6 sm:py-4 text-[clamp(1.125rem,4.5vw,1.375rem)] text-center font-bold outline-none focus:ring-4 focus:ring-white/40 transition"
                />
            </div>

            <button
                onclick={nextStage}
                disabled={!code}
                class="w-full bg-black text-white rounded-2xl py-[4vw] sm:py-4 font-bold text-[clamp(1.125rem,4.5vw,1.375rem)] flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-40 disabled:active:scale-100 drop-shadow-2xl"
            >
                ต่อไป
                <LogIn class="w-[5vw] h-[5vw] sm:w-5 sm:h-5" />
            </button>
        </div>
    {:else if stage === 'enter_name'}
        <div class="flex-1 flex flex-col w-full max-w-md mx-auto">
            {#if !configLoaded}
                <div class="flex-1 flex items-center justify-center">
                    <LoaderCircle class="w-[8vw] h-[8vw] sm:w-8 sm:h-8 text-white animate-spin" />
                </div>
            {:else if nameType === 'student_id'}
                <div class="flex-1 flex flex-col items-center justify-center gap-[3vh] text-center">
                    <span class="bg-white/15 p-[4vw] sm:p-5 rounded-2xl text-white">
                        <Fingerprint class="w-[8vw] h-[8vw] sm:w-8 sm:h-8" />
                    </span>

                    <div class="flex flex-col gap-[1vh]">
                        <h1 class="font-bold text-white text-[clamp(1.5rem,6vw,2.5rem)]">รหัสนักศึกษา</h1>
                        <p class="text-gray-100 text-[clamp(1rem,4vw,1.25rem)]">กรอกรหัสนักศึกษา 5 หลัก</p>
                    </div>

                    <input
                        type="text"
                        inputmode="numeric"
                        autocomplete="off"
                        pattern="\d{5}"
                        maxlength="5"
                        placeholder="12345"
                        value={studentId}
                        oninput={(e) => { studentId = e.currentTarget.value.replace(/\D/g, '').slice(0, 5) }}
                        class="w-full bg-white text-black placeholder-gray-400 rounded-2xl px-[5vw] py-[4vw] sm:px-6 sm:py-4 text-[clamp(1.125rem,4.5vw,1.375rem)] text-center font-bold tracking-[0.3em] outline-none focus:ring-4 focus:ring-white/40 transition"
                    />

                    {#if infoLoading}
                        <div class="flex items-center justify-center gap-2 text-white/80 text-[clamp(0.875rem,3.5vw,1rem)]">
                            <LoaderCircle class="w-[4vw] h-[4vw] sm:w-4 sm:h-4 animate-spin" />
                            กำลังค้นหาข้อมูล...
                        </div>
                    {:else if studentInfo}
                        <div class="w-full bg-white/15 backdrop-blur rounded-2xl p-[4vw] sm:p-5 text-white">
                            <p class="font-bold text-[clamp(1.125rem,4.5vw,1.375rem)]">
                                {studentInfo.student_firstname} {studentInfo.student_lastname}
                            </p>
                            <p class="text-gray-100 text-[clamp(0.875rem,3.5vw,1rem)] mt-[1vh]">
                                ชั้น {studentInfo.student_class} · เลขที่ {studentInfo.student_number}
                            </p>
                        </div>
                    {:else if infoError}
                        <p class="text-red-200 text-[clamp(0.875rem,3.5vw,1rem)]">{infoError}</p>
                    {/if}
                </div>

                <button
                    disabled={!idValid || !studentInfo}
                    class="w-full bg-black text-white rounded-2xl py-[4vw] sm:py-4 font-bold text-[clamp(1.125rem,4.5vw,1.375rem)] flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-40 disabled:active:scale-100 drop-shadow-2xl"
                >
                    เข้าร่วม
                    <LogIn class="w-[5vw] h-[5vw] sm:w-5 sm:h-5" />
                </button>
            {:else}
                <div class="flex-1 flex flex-col items-center justify-center gap-[3vh] text-center">
                    <span class="bg-white/15 p-[4vw] sm:p-5 rounded-2xl text-white">
                        <UserRound class="w-[8vw] h-[8vw] sm:w-8 sm:h-8" />
                    </span>

                    <div class="flex flex-col gap-[1vh]">
                        <h1 class="font-bold text-white text-[clamp(1.5rem,6vw,2.5rem)]">ชื่อของคุณ</h1>
                        <p class="text-gray-100 text-[clamp(1rem,4vw,1.25rem)]">เพื่อนของคุณจะเห็นชื่อนี้</p>
                    </div>

                    <input
                        type="text"
                        autocomplete="name"
                        placeholder="ชื่อของคุณ"
                        bind:value={name}
                        class="w-full bg-white text-black placeholder-gray-400 rounded-2xl px-[5vw] py-[4vw] sm:px-6 sm:py-4 text-[clamp(1.125rem,4.5vw,1.375rem)] text-center font-bold outline-none focus:ring-4 focus:ring-white/40 transition"
                    />
                </div>

                <button
                    disabled={!nameValid}
                    class="w-full bg-black text-white rounded-2xl py-[4vw] sm:py-4 font-bold text-[clamp(1.125rem,4.5vw,1.375rem)] flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-40 disabled:active:scale-100 drop-shadow-2xl"
                >
                    เข้าร่วม
                    <LogIn class="w-[5vw] h-[5vw] sm:w-5 sm:h-5" />
                </button>
            {/if}
        </div>
    {:else}
        <div class="flex-1 flex flex-col w-full max-w-md mx-auto">
            <div class="flex-1 flex flex-col items-center justify-center gap-[3vh] text-center">
                <span class="bg-white/15 p-[5vw] sm:p-6 rounded-3xl text-white">
                    <TriangleAlert class="w-[10vw] h-[10vw] sm:w-12 sm:h-12" />
                </span>

                <div class="flex flex-col gap-[1vh]">
                    <h1 class="font-bold text-white text-[clamp(1.5rem,6vw,2.5rem)]">ลิงก์ไม่ถูกต้อง</h1>
                    <p class="text-gray-100 text-[clamp(1rem,4vw,1.25rem)]">ไม่พบขั้นตอนที่ระบุในลิงก์นี้ กรุณาลองอีกครั้ง</p>
                </div>
            </div>

            <div class="flex flex-col gap-[2vh] w-full">
                <button
                    onclick={() => { window.location.href = '/join' }}
                    class="w-full bg-white text-black rounded-2xl py-[4vw] sm:py-4 font-bold text-[clamp(1.125rem,4.5vw,1.375rem)] flex items-center justify-center gap-2  drop-shadow-2xl"
                >
                    <KeyRound class="w-[5vw] h-[5vw] sm:w-5 sm:h-5" />
                    เริ่มใหม่
                </button>
                <button
                    onclick={() => { window.location.href = '/' }}
                    class="w-full bg-black text-white rounded-2xl py-[4vw] sm:py-4 font-bold text-[clamp(1.125rem,4.5vw,1.375rem)] drop-shadow-2xl justify-center items-center flex"
                >
                    กลับหน้าแรก
             </button>
            </div>
        </div>
    {/if}
</div>
