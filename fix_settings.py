content = open('C:/Users/USER/Desktop/My Project/school-manager/pages/admin/SystemSettings.tsx', 'r', encoding='utf-8').read()

search_text = '''Students with scores at or below this mark fail.
                    </p>
                  </div>
                </div>

                <div>
                  <label className=\"block text-sm font-medium text-slate-700 mb-2\">
                    Promotional Term'''

replace_text = '''Students with scores at or below this mark fail.
                    </p>
                  </div>
                </div>

                <div>
                  <label className=\"block text-sm font-medium text-slate-700 mb-2\">
                    Assessment Score Weights
                  </label>
                  <p className=\"text-xs text-slate-500 mb-4\">
                    Configure the maximum score for each assessment component. These weights are used to validate scores in the Teacher Assessment page.
                  </p>
                  <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4\">
                    {([
                      { key: \"testScore\", label: \"Class Score (Max)\" },
                      { key: \"homeworkScore\", label: \"Homework (Max)\" },
                      { key: \"projectScore\", label: \"Project (Max)\" },
                      { key: \"examScore\", label: \"Exam (Max)\" },
                    ] as const).map((item) => (
                      <div key={item.key}>
                        <label className=\"block text-xs font-semibold text-slate-600 mb-1\">
                          {item.label}
                        </label>
                        <input
                          type=\"number\"
                          min={1}
                          max={100}
                          value={config.assessmentScoreWeights?.[item.key] ?? \"\"}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              assessmentScoreWeights: {
                                testScore: config.assessmentScoreWeights?.testScore ?? 15,
                                homeworkScore: config.assessmentScoreWeights?.homeworkScore ?? 15,
                                projectScore: config.assessmentScoreWeights?.projectScore ?? 20,
                                examScore: config.assessmentScoreWeights?.examScore ?? 100,
                                [item.key]: Number(e.target.value || 0),
                              },
                            })
                          }
                          className=\"w-full border border-slate-200 p-2.5 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-emerald-200 outline-none\"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className=\"block text-sm font-medium text-slate-700 mb-2\">
                    Promotional Term'''

if search_text in content:
    content = content.replace(search_text, replace_text)
    open('C:/Users/USER/Desktop/My Project/school-manager/pages/admin/SystemSettings.tsx', 'w', encoding='utf-8').write(content)
    print('Done')
else:
    print('Search text not found!')