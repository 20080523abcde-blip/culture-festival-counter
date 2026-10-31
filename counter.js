import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
  getDatabase,
  onValue,
  ref,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";
import { adminUid, firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const counterRef = ref(db, "counter");
const $ = (id) => document.getElementById(id);
const count = $("count");
const status = $("status");
const error = $("error");
const controls = ["increment", "decrement", "set-count", "add-count", "reset"];
const targetInput = $("target-count");
const addInput = $("add-count-value");
let isAdmin = false;
let busy = false;
let pendingIncrements = 0;

function showError(message) {
  error.textContent = message;
  error.hidden = !message;
}

function explain(err) {
  const code = err?.code || "";
  if (code.includes("network") || code.includes("unavailable")) {
    return "通信に失敗しました。ネットワークを確認してください。";
  }
  if (code.includes("permission-denied")) {
    return "権限がありません。管理者アカウントを確認してください。";
  }
  if (["invalid-credential", "wrong-password", "user-not-found"].some((item) => code.includes(item))) {
    return "メールアドレスまたはパスワードを確認してください。";
  }
  return "処理に失敗しました。時間をおいて再度お試しください。";
}

function setBusy(value) {
  busy = value;
  for (const id of controls) $(id).disabled = !isAdmin || value;
  syncSetButton();
  syncAddButton();
}

function syncSetButton() {
  const value = targetInput.value;
  const valid = value !== "" && Number.isSafeInteger(Number(value)) && Number(value) >= 0;
  $("set-count").classList.toggle("ready", valid);
  $("set-count").disabled = !isAdmin || busy || !valid;
}

function syncAddButton() {
  const value = addInput.value;
  const valid = value !== "" && Number.isSafeInteger(Number(value)) && Number(value) > 0;
  $("add-count").classList.toggle("ready", valid);
  $("add-count").disabled = !isAdmin || busy || !valid;
}

async function updateCount(update) {
  const result = await runTransaction(counterRef, (current) => {
    const safeCurrent = Number.isSafeInteger(current) && current >= 0 ? current : 0;
    return update(safeCurrent);
  });
  if (!result.committed) throw new Error("更新が完了しませんでした。");
}

onValue(
  counterRef,
  (snapshot) => {
    count.textContent = snapshot.exists() ? Number(snapshot.val()).toLocaleString("ja-JP") : "0";
    status.textContent = "リアルタイム接続中";
    showError("");
  },
  () => {
    status.textContent = "接続エラー";
    showError("人数を取得できません。通信を確認してください。");
  },
);

$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
  } catch (err) {
    showError(explain(err));
  }
});

targetInput.addEventListener("input", syncSetButton);
addInput.addEventListener("input", syncAddButton);

onAuthStateChanged(auth, async (user) => {
  isAdmin = false;
  $("login-panel").hidden = !!user;
  $("counter-panel").hidden = !user;
  if (!user) {
    status.textContent = "閲覧モード";
    return;
  }
  try {
    isAdmin = user.uid === adminUid;
    if (!isAdmin) {
      await signOut(auth);
      showError("このアカウントに管理者権限はありません。");
      return;
    }
    $("signed-in").textContent = `${user.email} でログイン中`;
    setBusy(false);
    status.textContent = "管理者として接続中";
  } catch (err) {
    showError(explain(err));
  }
});

$("increment").addEventListener("click", async () => {
  if (!isAdmin) return;
  pendingIncrements += 1;
  if (busy) return;
  setBusy(true);
  $("increment").textContent = "加算中…";
  try {
    while (pendingIncrements > 0) {
      pendingIncrements -= 1;
      await updateCount((current) => current + 1);
    }
  } catch (err) {
    pendingIncrements = 0;
    showError(explain(err));
  } finally {
    $("increment").textContent = "＋1人";
    setBusy(false);
  }
});

$("decrement").addEventListener("click", async () => {
  if (!isAdmin || busy) return;
  setBusy(true);
  try {
    await updateCount((current) => Math.max(0, current - 1));
  } catch (err) {
    showError(explain(err));
  } finally {
    setBusy(false);
  }
});

$("add-count-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isAdmin || busy) return;
  const amount = Number(addInput.value);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    showError("1以上の整数を入力してください。");
    return;
  }
  if (!confirm(`${amount.toLocaleString("ja-JP")} 人を追加します。よろしいですか？`)) return;
  setBusy(true);
  try {
    await updateCount((current) => current + amount);
    addInput.value = "";
  } catch (err) {
    showError(explain(err));
  } finally {
    setBusy(false);
  }
});

$("set-count-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isAdmin || busy) return;
  const target = Number($("target-count").value);
  if (!Number.isSafeInteger(target) || target < 0) {
    showError("0以上の整数を入力してください。");
    return;
  }
  if (!confirm(`現在の人数を ${target.toLocaleString("ja-JP")} 人に変更します。よろしいですか？`)) return;
  setBusy(true);
  try {
    await updateCount(() => target);
    $("target-count").value = "";
  } catch (err) {
    showError(explain(err));
  } finally {
    setBusy(false);
  }
});

$("reset").addEventListener("click", async () => {
  if (!isAdmin || busy) return;
  if (!confirm(`来場者数 ${count.textContent} 人を0人にリセットしますか？`)) return;
  setBusy(true);
  try {
    await updateCount(() => 0);
  } catch (err) {
    showError(explain(err));
  } finally {
    setBusy(false);
  }
});

$("logout").addEventListener("click", () => signOut(auth).catch((err) => showError(explain(err))));
