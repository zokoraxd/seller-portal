<script setup>
const REPO_ISSUES = 'https://github.com/zokoraxd/seller-portal/issues'
</script>

<template>
  <article class="mx-auto max-w-3xl space-y-5">
    <header>
      <h1 class="text-xl font-extrabold">سياسة الخصوصية</h1>
      <p class="mt-1 text-xs text-slate-600">
        هذا نموذج مفاهيمي ببيانات تجريبية. تشرح هذه الصفحة بوضوح ما الذي يحدث لما تُدخله فيه.
      </p>
    </header>

    <section class="card space-y-2 p-5" aria-labelledby="p-collect">
      <h2 id="p-collect" class="text-sm font-extrabold">ما الذي يُجمع</h2>
      <ul class="list-disc space-y-1 ps-5 text-sm leading-relaxed text-slate-700">
        <li>لا حساب ولا كلمة مرور ولا بريد إلكتروني. يحصل متصفحك على <strong>معرّف جلسة مجهول</strong> عشوائي.</li>
        <li>ما تضيفه بنفسك: سجلات المبيعات التي ترفعها أو تكتبها، والرسائل والمهام والعروض داخل التطبيق.</li>
      </ul>
    </section>

    <section class="card space-y-2 p-5" aria-labelledby="p-where">
      <h2 id="p-where" class="text-sm font-extrabold">أين تُحفظ بياناتك</h2>
      <ul class="list-disc space-y-1 ps-5 text-sm leading-relaxed text-slate-700">
        <li>
          <strong>وضع «متصل بالخادم»:</strong> في قاعدة بيانات PostgreSQL لدى Supabase (مركز بيانات في فرانكفورت، ألمانيا). لكل زائر مساحة عمل
          خاصة معزولة بقواعد أمان على مستوى الصفوف، فلا يستطيع زائر آخر قراءة بياناتك أو تعديلها.
        </li>
        <li><strong>وضع «محلي»:</strong> في متصفحك فقط، ولا يُرسل شيء إلى أي خادم.</li>
        <li>الاستضافة على Vercel، وتسجّل سجلاتها التقنية المعتادة (عنوان IP وطلبات الصفحات).</li>
      </ul>
    </section>

    <section class="card space-y-2 p-5" aria-labelledby="p-who">
      <h2 id="p-who" class="text-sm font-extrabold">من يستطيع الاطلاع عليها</h2>
      <p class="text-sm leading-relaxed text-slate-700">
        لا يراها الزوار الآخرون. لكن مطوّر هذا النموذج يستطيع تقنياً قراءة محتوى قاعدة البيانات بحكم إدارته للمشروع، لذلك
        <strong>لا ترفع بيانات حقيقية</strong> لعملاء أو شركات أو أشخاص.
      </p>
    </section>

    <section class="card space-y-2 p-5" aria-labelledby="p-keep">
      <h2 id="p-keep" class="text-sm font-extrabold">المدة والحذف</h2>
      <ul class="list-disc space-y-1 ps-5 text-sm leading-relaxed text-slate-700">
        <li>تُحذف مساحة العمل تلقائياً بعد <strong>30 يوماً من عدم الاستخدام</strong>.</li>
        <li>زر «إعادة ضبط» في أعلى الصفحة يمسح مساحتك فوراً ويعيد البيانات التجريبية.</li>
        <li>مسح بيانات الموقع من المتصفح يبدأ مساحة جديدة، وتُحذف القديمة تلقائياً.</li>
      </ul>
    </section>

    <section class="card space-y-2 p-5" aria-labelledby="p-not">
      <h2 id="p-not" class="text-sm font-extrabold">ما لا نفعله</h2>
      <ul class="list-disc space-y-1 ps-5 text-sm leading-relaxed text-slate-700">
        <li>لا أدوات تحليلات ولا إعلانات ولا ملفات تعريف ارتباط للتتبّع.</li>
        <li>الخط مستضاف ذاتياً، فلا طلبات إلى خدمات خطوط خارجية.</li>
        <li>يخزّن المتصفح فقط ما يلزم لعمل التطبيق: جلسة مساحتك وتفضيل الدور المختار.</li>
      </ul>
    </section>

    <section class="card space-y-2 p-5" aria-labelledby="p-contact">
      <h2 id="p-contact" class="text-sm font-extrabold">التواصل</h2>
      <p class="text-sm leading-relaxed text-slate-700">
        لأي سؤال أو طلب حذف، افتح بلاغاً في
        <a :href="REPO_ISSUES" target="_blank" rel="noopener noreferrer" class="font-bold text-brand underline">صفحة المشروع على GitHub</a>.
      </p>
    </section>

    <p class="text-[11px] text-slate-600">نص مبسّط لنموذج تجريبي، وليس استشارة قانونية.</p>
  </article>
</template>
